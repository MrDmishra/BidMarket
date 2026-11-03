-- First onboarding step. Runs as the signed-in user and records consent in the same transaction.
create function public.create_organisation(
  p_kind public.org_kind,
  p_entity_type public.entity_type,
  p_legal_name text,
  p_policy_version text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
  v_org_id uuid;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  select * into v_profile from public.profiles where user_id = v_user_id for update;
  if not found or v_profile.role = 'admin' or v_profile.org_id is not null then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;

  if p_kind = 'seller' and p_entity_type = 'individual' then
    raise exception 'NOT_ELIGIBLE' using errcode = 'P0001';
  end if;

  insert into public.organisations (kind, entity_type, legal_name)
  values (p_kind, p_entity_type, trim(p_legal_name))
  returning id into v_org_id;

  update public.profiles set org_id = v_org_id where user_id = v_user_id;

  insert into public.consents (user_id, purpose, policy_version)
  values (v_user_id, 'terms_and_privacy', p_policy_version);

  insert into public.audit_log (actor_id, actor_role, org_id, action, entity_type, entity_id, after)
  values (v_user_id, 'org_user', v_org_id, 'organisation.created', 'organisation', v_org_id::text,
    jsonb_build_object('kind', p_kind, 'entity_type', p_entity_type));

  return v_org_id;
end;
$$;

revoke all on function public.create_organisation from public, anon, authenticated;
grant execute on function public.create_organisation to authenticated;
