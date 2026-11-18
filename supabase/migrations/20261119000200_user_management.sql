-- User management for admins: find any login, edit its name, turn its access off or on, and
-- send a password reset. Every write needs a reason and is audit logged.

create function private.audit_user(p_user_id uuid, p_action text, p_reason text, p_after jsonb default null)
returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_log (actor_id, actor_role, org_id, action, entity_type, entity_id, after, reason)
  values (auth.uid(), 'admin', (select org_id from public.profiles where user_id = p_user_id), p_action,
    'user', p_user_id::text, p_after, p_reason);
$$;

create function public.admin_users(
  p_search text default null, p_role text default null, p_access text default null,
  p_page integer default 1, p_page_size integer default 25
) returns table (
  user_id uuid, email text, full_name text, role public.user_role, org_id uuid, org_name text,
  org_kind public.org_kind, org_status public.org_status, disabled boolean, last_sign_in_at timestamptz,
  created_at timestamptz, total_count bigint
)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_size integer := least(greatest(coalesce(p_page_size, 25), 10), 100);
  v_search text := nullif(trim(p_search), '');
begin
  perform private.require_admin();
  return query
    select p.user_id, p.email, p.full_name, p.role, o.id, o.legal_name, o.kind, o.status,
      coalesce(u.banned_until > now(), false), u.last_sign_in_at, p.created_at, count(*) over ()
    from public.profiles p
    join auth.users u on u.id = p.user_id
    left join public.organisations o on o.id = p.org_id
    where (v_search is null or p.email ilike '%' || v_search || '%' or p.full_name ilike '%' || v_search || '%'
        or o.legal_name ilike '%' || v_search || '%')
      and (nullif(p_role, '') is null
        or (p_role = 'admin' and p.role = 'admin')
        or (p_role in ('buyer', 'seller') and o.kind::text = p_role)
        or (p_role = 'none' and p.role <> 'admin' and o.id is null))
      and (nullif(p_access, '') is null or (p_access = 'disabled') = coalesce(u.banned_until > now(), false))
    order by p.created_at desc
    limit v_size offset (greatest(coalesce(p_page, 1), 1) - 1) * v_size;
end;
$$;

-- Opening a user is logged, because the page shows contact details.
create function public.admin_user(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_result jsonb;
begin
  perform private.require_admin();
  select jsonb_build_object(
    'userId', p.user_id, 'email', p.email, 'fullName', p.full_name, 'designation', p.designation,
    'phone', p.phone, 'role', p.role, 'createdAt', p.created_at, 'lastSignInAt', u.last_sign_in_at,
    'emailConfirmed', u.email_confirmed_at is not null, 'disabled', coalesce(u.banned_until > now(), false),
    'isSelf', p.user_id = auth.uid(),
    'sessions', (select count(*) from auth.sessions s where s.user_id = p.user_id),
    'organisation', case when o.id is null then null else jsonb_build_object(
      'id', o.id, 'legalName', o.legal_name, 'kind', o.kind, 'status', o.status) end
  ) into v_result
  from public.profiles p
  join auth.users u on u.id = p.user_id
  left join public.organisations o on o.id = p.org_id
  where p.user_id = p_id;
  if v_result is null then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  perform private.audit_user(p_id, 'user.viewed', null);
  return v_result;
end;
$$;

create function public.admin_update_user(p_id uuid, p_full_name text, p_designation text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_reason text := private.require_reason(p_reason);
begin
  perform private.require_admin();
  if char_length(trim(coalesce(p_full_name, ''))) > 120 or char_length(trim(coalesce(p_designation, ''))) > 120 then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  update public.profiles
  set full_name = nullif(trim(p_full_name), ''), designation = nullif(trim(p_designation), '')
  where user_id = p_id;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  perform private.audit_user(p_id, 'user.updated', v_reason,
    jsonb_build_object('fullName', nullif(trim(p_full_name), ''), 'designation', nullif(trim(p_designation), '')));
end;
$$;

-- Turning access off blocks new logins and ends every open session at once.
create function public.admin_set_user_access(p_id uuid, p_disable boolean, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_reason text := private.require_reason(p_reason);
begin
  perform private.require_admin();
  if p_disable is null then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  -- An admin cannot lock themselves out.
  if p_id = auth.uid() then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  update auth.users set banned_until = case when p_disable then 'infinity'::timestamptz end where id = p_id;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if p_disable then
    delete from auth.sessions where user_id = p_id;
  end if;
  perform private.audit_user(p_id, case when p_disable then 'user.disabled' else 'user.enabled' end, v_reason);
end;
$$;

-- Returns the address to send a reset email to, and logs who asked.
create function public.admin_prepare_password_reset(p_id uuid, p_reason text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_reason text := private.require_reason(p_reason);
  v_email text;
begin
  perform private.require_admin();
  select email into v_email from public.profiles where user_id = p_id;
  if v_email is null then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  perform private.audit_user(p_id, 'user.reset_sent', v_reason);
  return v_email;
end;
$$;

revoke all on function public.admin_users, public.admin_user, public.admin_update_user, public.admin_set_user_access,
  public.admin_prepare_password_reset from public, anon;
grant execute on function public.admin_users, public.admin_user, public.admin_update_user, public.admin_set_user_access,
  public.admin_prepare_password_reset to authenticated;
