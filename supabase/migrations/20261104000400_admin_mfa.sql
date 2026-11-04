-- Admin power requires a second factor, enforced here so a stolen password alone cannot reach it.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select role = 'admin' from public.profiles where user_id = auth.uid())
      and auth.jwt() ->> 'aal' = 'aal2',
    false
  );
$$;
