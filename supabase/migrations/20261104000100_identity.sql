-- Identity tables from DATABASE.md section 3.1, plus the audit log.
-- Authenticated users read their own rows. Every write goes through a function.

create extension if not exists pgcrypto;

-- Supabase grants table access to anon and authenticated by default. Business tables must not inherit it.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

create type public.org_kind as enum ('buyer', 'seller');
create type public.entity_type as enum ('individual', 'proprietorship', 'partnership', 'trust_society', 'llp', 'company');
create type public.org_status as enum ('draft', 'pending_payment', 'pending_review', 'active', 'suspended', 'rejected');
create type public.user_role as enum ('org_user', 'admin');
create type public.verification_kind as enum ('pan', 'gstin', 'bank', 'cin', 'identity');
create type public.verification_status as enum ('pending', 'verified', 'failed', 'manual_review');

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.reject_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = 'P0001';
end;
$$;

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  kind public.org_kind not null,
  entity_type public.entity_type not null,
  legal_name text not null check (length(trim(legal_name)) between 2 and 200),
  pan_enc bytea,
  pan_hmac bytea,
  pan_last4 text check (pan_last4 ~ '^[0-9A-Z]{4}$'),
  gstin text check (gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$'),
  cin_llpin text,
  incorporated_on date,
  status public.org_status not null default 'draft',
  maintenance boolean not null default false,
  strike_count integer not null default 0 check (strike_count >= 0),
  blocked_until timestamptz,
  strikes_reset_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sellers_are_not_individuals check (kind <> 'seller' or entity_type <> 'individual'),
  constraint active_sellers_have_gstin check (kind <> 'seller' or status = 'draft' or gstin is not null),
  constraint submitted_orgs_have_pan check (status = 'draft' or pan_hmac is not null),
  constraint maintenance_is_for_sellers check (kind = 'seller' or not maintenance),
  unique (kind, pan_hmac)
);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete restrict,
  org_id uuid references public.organisations (id) on delete restrict,
  role public.user_role not null default 'org_user',
  full_name text,
  designation text,
  phone text unique,
  email text unique,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admins_have_no_org check (role <> 'admin' or org_id is null)
);

create index profiles_org_id_idx on public.profiles (org_id);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete restrict,
  purpose text not null,
  policy_version text not null,
  accepted_at timestamptz not null default now(),
  withdrawn_at timestamptz
);

create index consents_user_id_idx on public.consents (user_id);

create table public.org_addresses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete restrict,
  label text not null,
  line1 text not null,
  line2 text,
  city text not null,
  state_code char(2) not null check (state_code ~ '^[0-9]{2}$'),
  pincode char(6) not null check (pincode ~ '^[1-9][0-9]{5}$'),
  is_registered boolean not null default false,
  created_at timestamptz not null default now()
);

create index org_addresses_org_id_idx on public.org_addresses (org_id);
create unique index one_registered_address on public.org_addresses (org_id) where is_registered;

create trigger org_addresses_immutable before update or delete on public.org_addresses
  for each row execute function public.reject_change();

create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete restrict,
  holder_name text not null,
  account_no_enc bytea not null,
  account_last4 text not null check (account_last4 ~ '^[0-9]{4}$'),
  ifsc text not null check (ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$'),
  is_primary boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index bank_accounts_org_id_idx on public.bank_accounts (org_id);
create unique index one_primary_bank_account on public.bank_accounts (org_id) where is_primary;

create function public.bank_account_stays_fixed() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE'
    or (to_jsonb(new) - 'is_primary' - 'verified_at') <> (to_jsonb(old) - 'is_primary' - 'verified_at') then
    raise exception 'Saved bank accounts cannot be changed' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger bank_accounts_fixed before update or delete on public.bank_accounts
  for each row execute function public.bank_account_stays_fixed();

create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete restrict,
  kind public.verification_kind not null,
  status public.verification_status not null default 'pending',
  provider text,
  provider_ref text,
  result jsonb not null default '{}',
  reviewed_by uuid references public.profiles (user_id) on delete restrict,
  checked_at timestamptz,
  created_at timestamptz not null default now()
);

create index verifications_org_kind_idx on public.verifications (org_id, kind);

create table public.turnover_declarations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete restrict,
  financial_year text not null check (financial_year ~ '^[0-9]{4}-[0-9]{2}$'),
  amount_paise bigint not null check (amount_paise >= 0),
  created_at timestamptz not null default now(),
  unique (org_id, financial_year)
);

create table public.otp_attempts (
  id uuid primary key default gen_random_uuid(),
  phone_or_email_hmac bytea not null,
  purpose text not null,
  sent_at timestamptz not null default now(),
  resend_count integer not null default 0 check (resend_count >= 0),
  locked_until timestamptz
);

create index otp_attempts_lookup_idx on public.otp_attempts (phone_or_email_hmac, purpose, sent_at desc);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_role text,
  org_id uuid,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before jsonb,
  after jsonb,
  reason text,
  ip inet,
  request_id text,
  created_at timestamptz not null default now()
);

create index audit_log_entity_idx on public.audit_log (entity_type, entity_id, created_at desc);

create trigger audit_log_append_only before update or delete on public.audit_log
  for each row execute function public.reject_change();

create trigger organisations_updated before update on public.organisations
  for each row execute function public.set_updated_at();
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Every new sign-up starts as an ordinary user. Role never comes from sign-up metadata.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, phone, email)
  values (new.id, new.phone, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.current_org_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select org_id from public.profiles where user_id = auth.uid();
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'admin' from public.profiles where user_id = auth.uid()), false);
$$;

revoke all on function public.set_updated_at, public.reject_change, public.bank_account_stays_fixed,
  public.handle_new_user, public.current_org_id, public.is_admin from public, anon, authenticated;
grant execute on function public.current_org_id, public.is_admin to authenticated;

alter table public.organisations enable row level security;
alter table public.profiles enable row level security;
alter table public.consents enable row level security;
alter table public.org_addresses enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.verifications enable row level security;
alter table public.turnover_declarations enable row level security;
alter table public.otp_attempts enable row level security;
alter table public.audit_log enable row level security;

revoke all on public.organisations, public.profiles, public.consents, public.org_addresses,
  public.bank_accounts, public.verifications, public.turnover_declarations, public.otp_attempts,
  public.audit_log from anon, authenticated;

-- Encrypted values and lookup hashes stay out of reach, even for the owner.
grant select (id, kind, entity_type, legal_name, pan_last4, gstin, cin_llpin, incorporated_on, status,
  maintenance, strike_count, blocked_until, created_at, updated_at) on public.organisations to authenticated;
grant select (id, org_id, holder_name, account_last4, ifsc, is_primary, verified_at, created_at)
  on public.bank_accounts to authenticated;
grant select (user_id, org_id, role, full_name, designation, phone, email, theme, created_at, updated_at)
  on public.profiles to authenticated;
grant select on public.consents, public.org_addresses, public.turnover_declarations to authenticated;
grant select (id, org_id, kind, status, checked_at, created_at) on public.verifications to authenticated;
grant select on public.audit_log to authenticated;

create policy own_org on public.organisations for select to authenticated
  using (id = public.current_org_id());
create policy own_profile on public.profiles for select to authenticated
  using (user_id = auth.uid());
create policy own_consents on public.consents for select to authenticated
  using (user_id = auth.uid());
create policy own_addresses on public.org_addresses for select to authenticated
  using (org_id = public.current_org_id());
create policy own_bank_accounts on public.bank_accounts for select to authenticated
  using (org_id = public.current_org_id());
create policy own_verifications on public.verifications for select to authenticated
  using (org_id = public.current_org_id());
create policy own_turnover on public.turnover_declarations for select to authenticated
  using (org_id = public.current_org_id());
create policy admin_reads_audit on public.audit_log for select to authenticated
  using (public.is_admin());
