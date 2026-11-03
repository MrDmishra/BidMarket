-- Minimal stand-in for Supabase, so database tests run on plain PostgreSQL.
do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
  end if;
end;
$$;

grant usage on schema public to anon, authenticated, service_role;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (id uuid primary key, phone text, email text, raw_user_meta_data jsonb);

create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- Mirrors Supabase's default grants, which the migration must remove.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
