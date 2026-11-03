-- Manual verification. Provider checks replace the review queue later without changing these tables.
-- Keys live in Supabase Vault and are generated here, so they never pass through code or chat.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

do $$
begin
  if not exists (select from vault.secrets where name = 'field_encryption_key') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'base64'), 'field_encryption_key');
  end if;
  if not exists (select from vault.secrets where name = 'field_hmac_key') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'base64'), 'field_hmac_key');
  end if;
end;
$$;

create function private.secret(p_name text) returns text
language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = p_name;
$$;

create function private.encrypt(p_value text) returns bytea
language sql stable security definer set search_path = '' as $$
  select extensions.pgp_sym_encrypt(p_value, private.secret('field_encryption_key'), 'cipher-algo=aes256');
$$;

create function private.lookup_hash(p_value text) returns bytea
language sql stable security definer set search_path = '' as $$
  select extensions.hmac(p_value, private.secret('field_hmac_key'), 'sha256');
$$;

create function private.audit(p_org_id uuid, p_action text, p_after jsonb default null, p_reason text default null)
returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_log (actor_id, actor_role, org_id, action, entity_type, entity_id, after, reason)
  values (auth.uid(), case when public.is_admin() then 'admin' else 'org_user' end, p_org_id, p_action,
    'organisation', p_org_id::text, p_after, p_reason);
$$;

-- Returns the caller's organisation only while it can still be edited.
create function private.draft_org() returns public.organisations
language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organisations;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;
  select * into v_org from public.organisations where id = public.current_org_id() for update;
  if not found or v_org.status <> 'draft' then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  return v_org;
end;
$$;

create function public.save_business_identity(p_pan text, p_gstin text, p_incorporated_on date default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organisations := private.draft_org();
  v_gstin text := nullif(trim(p_gstin), '');
begin
  if p_pan !~ '^[A-Z]{5}[0-9]{4}[A-Z]$' then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if v_org.kind = 'seller' and v_gstin is null then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if v_gstin is not null and substr(v_gstin, 3, 10) <> p_pan then
    raise exception 'VERIFICATION_FAILED' using errcode = 'P0001';
  end if;

  begin
    update public.organisations
    set pan_enc = private.encrypt(p_pan), pan_hmac = private.lookup_hash(p_pan),
      pan_last4 = right(p_pan, 4), gstin = v_gstin, incorporated_on = p_incorporated_on
    where id = v_org.id;
  exception when unique_violation then
    raise exception 'VERIFICATION_FAILED' using errcode = 'P0001';
  end;

  insert into public.verifications (org_id, kind, status, provider)
  select v_org.id, 'pan', 'manual_review', 'manual'
  where not exists (select from public.verifications where org_id = v_org.id and kind = 'pan');
  perform private.audit(v_org.id, 'organisation.identity_saved');
end;
$$;

create function public.add_registered_address(
  p_line1 text, p_line2 text, p_city text, p_state_code text, p_pincode text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organisations := private.draft_org();
  v_id uuid;
begin
  if exists (select from public.org_addresses where org_id = v_org.id and is_registered) then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  insert into public.org_addresses (org_id, label, line1, line2, city, state_code, pincode, is_registered)
  values (v_org.id, 'Registered office', p_line1, nullif(trim(p_line2), ''), p_city, p_state_code, p_pincode, true)
  returning id into v_id;
  perform private.audit(v_org.id, 'organisation.address_added');
  return v_id;
end;
$$;

create function public.add_bank_account(p_holder_name text, p_account_no text, p_ifsc text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organisations := private.draft_org();
  v_id uuid;
begin
  if p_account_no !~ '^[0-9]{9,18}$' then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if exists (select from public.bank_accounts where org_id = v_org.id and is_primary) then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  insert into public.bank_accounts (org_id, holder_name, account_no_enc, account_last4, ifsc, is_primary)
  values (v_org.id, p_holder_name, private.encrypt(p_account_no), right(p_account_no, 4), p_ifsc, true)
  returning id into v_id;
  insert into public.verifications (org_id, kind, status, provider)
  values (v_org.id, 'bank', 'manual_review', 'manual');
  perform private.audit(v_org.id, 'organisation.bank_added');
  return v_id;
end;
$$;

create function public.save_turnover(p_years jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organisations := private.draft_org();
begin
  if v_org.kind <> 'seller' or jsonb_array_length(p_years) <> 3 then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  insert into public.turnover_declarations (org_id, financial_year, amount_paise)
  select v_org.id, item ->> 'financialYear', (item ->> 'amountPaise')::bigint
  from jsonb_array_elements(p_years) as item
  on conflict (org_id, financial_year) do update set amount_paise = excluded.amount_paise;
  perform private.audit(v_org.id, 'organisation.turnover_saved');
end;
$$;

create function public.submit_organisation() returns public.org_status
language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organisations := private.draft_org();
  v_status public.org_status;
begin
  if v_org.pan_hmac is null
    or not exists (select from public.org_addresses where org_id = v_org.id and is_registered)
    or not exists (select from public.bank_accounts where org_id = v_org.id and is_primary)
    or (v_org.kind = 'seller' and (select count(*) from public.turnover_declarations where org_id = v_org.id) < 3)
  then
    raise exception 'VERIFICATION_FAILED' using errcode = 'P0001';
  end if;

  v_status := case when v_org.kind = 'seller' then 'pending_payment' else 'pending_review' end;
  update public.organisations set status = v_status where id = v_org.id;
  perform private.audit(v_org.id, 'organisation.submitted', jsonb_build_object('status', v_status));
  return v_status;
end;
$$;

create function public.admin_pending_organisations()
returns table (id uuid, kind public.org_kind, entity_type public.entity_type, legal_name text,
  pan_last4 text, gstin text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  return query
    select o.id, o.kind, o.entity_type, o.legal_name, o.pan_last4, o.gstin, o.created_at
    from public.organisations o
    where o.status = 'pending_review'
    order by o.created_at
    limit 100;
end;
$$;

create function public.admin_review_organisation(p_org_id uuid, p_approve boolean, p_reason text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_status public.org_status;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  select status into v_status from public.organisations where id = p_org_id for update;
  if not found or v_status <> 'pending_review' then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;

  update public.organisations
  set status = case when p_approve then 'active'::public.org_status else 'rejected'::public.org_status end
  where id = p_org_id;
  update public.verifications
  set status = case when p_approve then 'verified'::public.verification_status else 'failed'::public.verification_status end,
    reviewed_by = auth.uid(), checked_at = now()
  where org_id = p_org_id and status = 'manual_review';
  perform private.audit(p_org_id, case when p_approve then 'organisation.approved' else 'organisation.rejected' end, null, p_reason);
end;
$$;

revoke all on function public.save_business_identity, public.add_registered_address, public.add_bank_account,
  public.save_turnover, public.submit_organisation, public.admin_pending_organisations,
  public.admin_review_organisation from public, anon, authenticated;
grant execute on function public.save_business_identity, public.add_registered_address, public.add_bank_account,
  public.save_turnover, public.submit_organisation, public.admin_pending_organisations,
  public.admin_review_organisation to authenticated;
