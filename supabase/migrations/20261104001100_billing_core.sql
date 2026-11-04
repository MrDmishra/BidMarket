-- Billing core: settings, charges, payments, wallet, tax invoices, subscriptions and the outbox.
create type public.charge_kind as enum (
  'direct_buyer', 'direct_seller', 'tender_buyer', 'tender_deposit', 'tender_balance', 'tender_seller', 'subscription'
);
create type public.charge_status as enum ('pending', 'held', 'paid', 'released', 'cancelled');
create type public.wallet_bucket as enum ('available', 'on_hold', 'paid');
create type public.payment_status as enum ('created', 'paid', 'failed');

create table public.platform_settings (
  id uuid primary key default gen_random_uuid(),
  effective_from timestamptz not null default now(),
  direct_fee_bps integer not null check (direct_fee_bps between 0 and 10000),
  tender_fee_bps integer not null check (tender_fee_bps between 0 and 10000),
  gst_bps integer not null check (gst_bps between 0 and 10000),
  tds_bps integer not null check (tds_bps between 0 and 10000),
  limit_individual_paise bigint not null check (limit_individual_paise > 0),
  limit_org_paise bigint not null check (limit_org_paise > 0),
  custom_deposit_paise bigint not null check (custom_deposit_paise >= 0),
  min_discount_bps integer not null check (min_discount_bps between 0 and 10000),
  subscription_base_paise bigint not null check (subscription_base_paise >= 0),
  subscription_base_crore integer not null check (subscription_base_crore >= 0),
  subscription_step_paise bigint not null check (subscription_step_paise >= 0),
  free_subscription_sellers integer not null default 0 check (free_subscription_sellers >= 0),
  decrement_bps integer not null check (decrement_bps between 0 and 10000),
  snipe_window_minutes integer not null check (snipe_window_minutes >= 0),
  snipe_max integer not null check (snipe_max >= 0),
  award_window_hours integer not null check (award_window_hours > 0),
  supplier_legal_name text not null,
  supplier_gstin text,
  supplier_state_code char(2) not null,
  created_by uuid references public.profiles (user_id)
);

insert into public.platform_settings (
  direct_fee_bps, tender_fee_bps, gst_bps, tds_bps, limit_individual_paise, limit_org_paise, custom_deposit_paise,
  min_discount_bps, subscription_base_paise, subscription_base_crore, subscription_step_paise, decrement_bps,
  snipe_window_minutes, snipe_max, award_window_hours, supplier_legal_name, supplier_state_code
) values (10, 50, 1800, 0, 2000000, 5000000, 100000, 1000, 2500000, 25, 10000, 50, 5, 6, 48, 'Bid Market', '08');

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id),
  turnover_paise bigint not null check (turnover_paise >= 0),
  fee_paise bigint not null check (fee_paise >= 0),
  starts_on date,
  ends_on date,
  status text not null default 'pending' check (status in ('pending', 'active', 'expired', 'cancelled')),
  settings_id uuid not null references public.platform_settings (id),
  created_at timestamptz not null default now()
);
create unique index subscriptions_one_active on public.subscriptions (org_id) where status = 'active';
create unique index subscriptions_one_pending on public.subscriptions (org_id) where status = 'pending';

-- order_id and tender_id gain foreign keys when Phases 5 and 6 add those tables.
create table public.fee_charges (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id),
  kind public.charge_kind not null,
  order_id uuid,
  tender_id uuid,
  subscription_id uuid references public.subscriptions (id),
  base_paise bigint not null check (base_paise >= 0),
  rate_bps integer not null check (rate_bps >= 0),
  fee_paise bigint not null check (fee_paise >= 0),
  cgst_paise bigint not null default 0 check (cgst_paise >= 0),
  sgst_paise bigint not null default 0 check (sgst_paise >= 0),
  igst_paise bigint not null default 0 check (igst_paise >= 0),
  tds_paise bigint not null default 0 check (tds_paise >= 0),
  total_paise bigint not null check (total_paise >= 0),
  status public.charge_status not null default 'pending',
  settings_id uuid not null references public.platform_settings (id),
  created_at timestamptz not null default now(),
  check (num_nonnulls(order_id, tender_id, subscription_id) = 1),
  check (total_paise = fee_paise + cgst_paise + sgst_paise + igst_paise - tds_paise)
);
create index fee_charges_org_idx on public.fee_charges (org_id, created_at desc);
create unique index fee_charges_one_per_subscription on public.fee_charges (subscription_id) where subscription_id is not null;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id),
  charge_id uuid not null references public.fee_charges (id),
  provider text not null default 'razorpay',
  provider_order_id text unique,
  provider_payment_id text unique,
  amount_paise bigint not null check (amount_paise > 0),
  status public.payment_status not null default 'created',
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_charge_idx on public.payments (charge_id);
create index payments_unresolved_idx on public.payments (created_at) where status = 'created';

create table public.wallet_entries (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organisations (id),
  charge_id uuid references public.fee_charges (id),
  from_bucket public.wallet_bucket,
  to_bucket public.wallet_bucket not null,
  amount_paise bigint not null check (amount_paise > 0),
  reason text not null,
  created_at timestamptz not null default now(),
  check (from_bucket is distinct from to_bucket)
);
create index wallet_entries_org_idx on public.wallet_entries (org_id, id desc);
create index wallet_entries_charge_idx on public.wallet_entries (charge_id);

create table public.number_sequences (
  name text not null,
  financial_year text not null,
  next_value bigint not null default 1,
  primary key (name, financial_year)
);

-- The snapshot keeps the invoice exact even if names or settings change later.
create table public.tax_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_no text not null unique,
  financial_year text not null,
  org_id uuid not null references public.organisations (id),
  charge_id uuid not null unique references public.fee_charges (id),
  snapshot jsonb not null,
  issued_at timestamptz not null default now()
);
create index tax_invoices_org_idx on public.tax_invoices (org_id, issued_at desc);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text,
  unique (provider, event_id)
);

create table public.outbox (
  id uuid primary key default gen_random_uuid(),
  channel text not null default 'email' check (channel in ('email', 'sms')),
  template text not null,
  recipient_user_id uuid not null references public.profiles (user_id),
  payload jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  dedupe_key text not null unique,
  last_error text
);
create index outbox_due_idx on public.outbox (next_attempt_at) where status = 'pending';

create trigger platform_settings_append_only before update or delete on public.platform_settings
  for each row execute function public.reject_change();
create trigger wallet_entries_append_only before update or delete on public.wallet_entries
  for each row execute function public.reject_change();
create trigger tax_invoices_append_only before update or delete on public.tax_invoices
  for each row execute function public.reject_change();

alter table public.platform_settings enable row level security;
alter table public.subscriptions enable row level security;
alter table public.fee_charges enable row level security;
alter table public.payments enable row level security;
alter table public.wallet_entries enable row level security;
alter table public.number_sequences enable row level security;
alter table public.tax_invoices enable row level security;
alter table public.webhook_events enable row level security;
alter table public.outbox enable row level security;

revoke all on public.platform_settings, public.subscriptions, public.fee_charges, public.payments,
  public.wallet_entries, public.number_sequences, public.tax_invoices, public.webhook_events, public.outbox
  from anon, authenticated;
grant select on public.platform_settings to anon, authenticated;
grant select on public.subscriptions, public.fee_charges, public.payments, public.wallet_entries,
  public.tax_invoices to authenticated;

create policy public_settings on public.platform_settings for select to anon, authenticated using (true);
create policy own_subscriptions on public.subscriptions for select to authenticated
  using (org_id = public.current_org_id() or public.is_admin());
create policy own_charges on public.fee_charges for select to authenticated
  using (org_id = public.current_org_id() or public.is_admin());
create policy own_payments on public.payments for select to authenticated
  using (org_id = public.current_org_id() or public.is_admin());
create policy own_wallet on public.wallet_entries for select to authenticated
  using (org_id = public.current_org_id() or public.is_admin());
create policy own_invoices on public.tax_invoices for select to authenticated
  using (org_id = public.current_org_id() or public.is_admin());

create function private.current_settings() returns public.platform_settings
language sql stable security definer set search_path = '' as $$
  select * from public.platform_settings where effective_from <= now() order by effective_from desc, id limit 1;
$$;

create function private.billing_org() returns public.organisations
language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organisations;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;
  select * into v_org from public.organisations where id = public.current_org_id();
  if not found then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  return v_org;
end;
$$;

create function private.audit_billing(p_org_id uuid, p_entity_id uuid, p_action text, p_after jsonb default null)
returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_log (actor_id, actor_role, org_id, action, entity_type, entity_id, after)
  values (auth.uid(), case when auth.uid() is null then 'system' else 'org_user' end, p_org_id, p_action,
    'billing', p_entity_id::text, p_after);
$$;

-- Same state means CGST and SGST. Another state means IGST. The odd paisa goes to SGST.
create function private.create_charge(
  p_org_id uuid, p_kind public.charge_kind, p_subscription_id uuid, p_base_paise bigint, p_rate_bps integer,
  p_settings public.platform_settings
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_state char(2);
  v_fee bigint := round(p_base_paise::numeric * p_rate_bps / 10000);
  v_gst bigint;
  v_cgst bigint := 0;
  v_sgst bigint := 0;
  v_igst bigint := 0;
  v_tds bigint;
  v_id uuid;
begin
  select state_code into v_state from public.org_addresses where org_id = p_org_id and is_registered;
  if not found then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  v_gst := round(v_fee::numeric * p_settings.gst_bps / 10000);
  v_tds := round(v_fee::numeric * p_settings.tds_bps / 10000);
  if v_state = p_settings.supplier_state_code then
    v_cgst := v_gst / 2;
    v_sgst := v_gst - v_cgst;
  else
    v_igst := v_gst;
  end if;
  insert into public.fee_charges (
    org_id, kind, subscription_id, base_paise, rate_bps, fee_paise, cgst_paise, sgst_paise, igst_paise,
    tds_paise, total_paise, settings_id
  ) values (
    p_org_id, p_kind, p_subscription_id, p_base_paise, p_rate_bps, v_fee, v_cgst, v_sgst, v_igst,
    v_tds, v_fee + v_gst - v_tds, p_settings.id
  ) returning id into v_id;
  return v_id;
end;
$$;

create function private.financial_year(p_at timestamptz default now()) returns text
language sql stable set search_path = '' as $$
  select case when extract(month from local_date) >= 4
    then extract(year from local_date)::int || '-' || right((extract(year from local_date)::int + 1)::text, 2)
    else (extract(year from local_date)::int - 1) || '-' || right(extract(year from local_date)::int::text, 2)
  end
  from (select (p_at at time zone 'Asia/Kolkata')::date as local_date) as dates;
$$;

-- The row lock keeps numbers gapless, because a rollback also undoes the increment.
create function private.next_invoice_no(p_financial_year text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_value bigint;
begin
  insert into public.number_sequences (name, financial_year, next_value)
  values ('tax_invoice', p_financial_year, 2)
  on conflict (name, financial_year) do update set next_value = public.number_sequences.next_value + 1
  returning next_value - 1 into v_value;
  return 'BM/' || p_financial_year || '/' || lpad(v_value::text, 6, '0');
end;
$$;

create function private.issue_invoice(p_charge public.fee_charges) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_year text := private.financial_year();
  v_org public.organisations;
  v_settings public.platform_settings;
  v_address public.org_addresses;
begin
  select * into v_org from public.organisations where id = p_charge.org_id;
  select * into v_settings from public.platform_settings where id = p_charge.settings_id;
  select * into v_address from public.org_addresses where org_id = p_charge.org_id and is_registered;
  insert into public.tax_invoices (invoice_no, financial_year, org_id, charge_id, snapshot)
  values (private.next_invoice_no(v_year), v_year, p_charge.org_id, p_charge.id, jsonb_build_object(
    'supplierName', v_settings.supplier_legal_name,
    'supplierGstin', v_settings.supplier_gstin,
    'supplierStateCode', v_settings.supplier_state_code,
    'customerName', v_org.legal_name,
    'customerGstin', v_org.gstin,
    'customerStateCode', v_address.state_code,
    'customerAddress', concat_ws(', ', v_address.line1, v_address.line2, v_address.city, v_address.pincode),
    'kind', p_charge.kind,
    'feePaise', p_charge.fee_paise,
    'cgstPaise', p_charge.cgst_paise,
    'sgstPaise', p_charge.sgst_paise,
    'igstPaise', p_charge.igst_paise,
    'tdsPaise', p_charge.tds_paise,
    'totalPaise', p_charge.total_paise
  ));
end;
$$;

create function private.notify_org(p_org_id uuid, p_template text, p_dedupe text, p_payload jsonb default '{}')
returns void
language sql security definer set search_path = '' as $$
  insert into public.outbox (template, recipient_user_id, payload, dedupe_key)
  select p_template, p.user_id, p_payload, p_dedupe || ':' || p.user_id
  from public.profiles p where p.org_id = p_org_id
  on conflict (dedupe_key) do nothing;
$$;

create function private.activate_subscription(p_subscription_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_subscription public.subscriptions;
  v_starts date := (now() at time zone 'Asia/Kolkata')::date;
  v_current_end date;
begin
  select * into v_subscription from public.subscriptions where id = p_subscription_id for update;
  select ends_on into v_current_end from public.subscriptions
  where org_id = v_subscription.org_id and status = 'active' for update;
  if v_current_end >= v_starts then
    v_starts := v_current_end + 1;
  end if;
  update public.subscriptions set status = 'expired' where org_id = v_subscription.org_id and status = 'active';
  update public.subscriptions set status = 'active', starts_on = v_starts,
    ends_on = (v_starts + interval '1 year')::date - 1
  where id = p_subscription_id;
  update public.organisations set status = 'active'
  where id = v_subscription.org_id and status = 'pending_payment';
end;
$$;

-- Safe to call twice: only a pending charge settles. Phases 5 and 6 add their kinds here.
create function private.settle_charge(p_charge_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_charge public.fee_charges;
  v_held bigint;
begin
  select * into v_charge from public.fee_charges where id = p_charge_id for update;
  if v_charge.status <> 'pending' then
    return false;
  end if;
  select coalesce(sum(amount_paise) filter (where to_bucket = 'on_hold'), 0)
       - coalesce(sum(amount_paise) filter (where from_bucket = 'on_hold'), 0)
  into v_held from public.wallet_entries where charge_id = p_charge_id;

  if v_held > 0 then
    insert into public.wallet_entries (org_id, charge_id, from_bucket, to_bucket, amount_paise, reason)
    values (v_charge.org_id, p_charge_id, 'on_hold', 'paid', v_held, 'Wallet balance used for a fee');
  end if;
  if v_charge.total_paise > v_held then
    insert into public.wallet_entries (org_id, charge_id, to_bucket, amount_paise, reason)
    values (v_charge.org_id, p_charge_id, 'paid', v_charge.total_paise - v_held, 'Fee paid online');
  end if;

  update public.fee_charges set status = 'paid' where id = p_charge_id;
  if v_charge.total_paise > 0 then
    perform private.issue_invoice(v_charge);
  end if;
  if v_charge.kind = 'subscription' then
    perform private.activate_subscription(v_charge.subscription_id);
  end if;
  perform private.audit_billing(v_charge.org_id, p_charge_id, 'charge.paid',
    jsonb_build_object('kind', v_charge.kind, 'totalPaise', v_charge.total_paise));
  perform private.notify_org(v_charge.org_id, 'charge_paid', 'charge_paid:' || p_charge_id,
    jsonb_build_object('kind', v_charge.kind, 'totalPaise', v_charge.total_paise));
  return true;
end;
$$;

create function private.subscription_quote(p_org public.organisations, p_settings public.platform_settings)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_turnover bigint;
  v_free boolean;
  v_fee bigint;
begin
  select coalesce(sum(amount_paise), 0) into v_turnover
  from (
    select amount_paise from public.turnover_declarations
    where org_id = p_org.id order by financial_year desc limit 3
  ) as recent;
  v_free := not exists (
      select from public.subscriptions where org_id = p_org.id and status in ('active', 'expired')
    ) and (
      select count(distinct org_id) from public.subscriptions where status in ('active', 'expired')
    ) < p_settings.free_subscription_sellers;
  v_fee := p_settings.subscription_base_paise
    + greatest(0, v_turnover / 1000000000 - p_settings.subscription_base_crore) * p_settings.subscription_step_paise;
  return jsonb_build_object(
    'turnoverPaise', v_turnover,
    'feePaise', case when v_free then 0 else v_fee end,
    'gstPaise', case when v_free then 0 else round(v_fee::numeric * p_settings.gst_bps / 10000)::bigint end,
    'free', v_free
  );
end;
$$;

create function public.quote_subscription() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_org public.organisations;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;
  select * into v_org from public.organisations where id = public.current_org_id();
  if not found or v_org.kind <> 'seller' then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  return private.subscription_quote(v_org, private.current_settings());
end;
$$;

create function public.start_subscription() returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organisations := private.billing_org();
  v_settings public.platform_settings := private.current_settings();
  v_quote jsonb;
  v_subscription_id uuid;
  v_charge_id uuid;
  v_fee bigint;
begin
  if v_org.kind <> 'seller' then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if v_org.status not in ('pending_payment', 'active') then
    raise exception 'ACCOUNT_NOT_ACTIVE' using errcode = 'P0001';
  end if;
  -- One at a time, so the free seller count stays exact.
  perform pg_advisory_xact_lock(hashtext('start_subscription'));

  select c.id into v_charge_id from public.subscriptions s
  join public.fee_charges c on c.subscription_id = s.id
  where s.org_id = v_org.id and s.status = 'pending' and c.status = 'pending';
  if found then
    return v_charge_id;
  end if;
  if exists (
    select from public.subscriptions where org_id = v_org.id and status = 'active'
      and ends_on > (now() at time zone 'Asia/Kolkata')::date + 30
  ) then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;

  v_quote := private.subscription_quote(v_org, v_settings);
  v_fee := (v_quote ->> 'feePaise')::bigint;
  insert into public.subscriptions (org_id, turnover_paise, fee_paise, settings_id)
  values (v_org.id, (v_quote ->> 'turnoverPaise')::bigint, v_fee, v_settings.id)
  returning id into v_subscription_id;
  v_charge_id := private.create_charge(v_org.id, 'subscription', v_subscription_id, v_fee, 10000, v_settings);
  perform private.audit_billing(v_org.id, v_charge_id, 'subscription.started', v_quote);
  if v_fee = 0 then
    perform private.settle_charge(v_charge_id);
  end if;
  return v_charge_id;
end;
$$;

-- Applies wallet balance first, then returns what is still due online.
create function public.begin_checkout(p_charge_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organisations := private.billing_org();
  v_charge public.fee_charges;
  v_payment public.payments;
  v_available bigint;
  v_held bigint;
  v_applied bigint;
  v_due bigint;
begin
  select * into v_charge from public.fee_charges where id = p_charge_id and org_id = v_org.id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_charge.status <> 'pending' then
    return jsonb_build_object('status', v_charge.status, 'amountPaise', 0);
  end if;

  select coalesce(sum(amount_paise) filter (where to_bucket = 'available'), 0)
       - coalesce(sum(amount_paise) filter (where from_bucket = 'available'), 0)
  into v_available from public.wallet_entries where org_id = v_org.id;
  select coalesce(sum(amount_paise) filter (where to_bucket = 'on_hold'), 0)
       - coalesce(sum(amount_paise) filter (where from_bucket = 'on_hold'), 0)
  into v_held from public.wallet_entries where charge_id = p_charge_id;

  v_applied := least(v_available, v_charge.total_paise - v_held);
  if v_applied > 0 then
    insert into public.wallet_entries (org_id, charge_id, from_bucket, to_bucket, amount_paise, reason)
    values (v_org.id, p_charge_id, 'available', 'on_hold', v_applied, 'Held for a fee payment');
  end if;
  v_due := v_charge.total_paise - v_held - v_applied;
  if v_due = 0 then
    perform private.settle_charge(p_charge_id);
    return jsonb_build_object('status', 'paid', 'amountPaise', 0);
  end if;

  update public.payments set status = 'failed', failure_reason = 'Replaced by a new amount', updated_at = now()
  where charge_id = p_charge_id and status <> 'paid' and amount_paise <> v_due;
  -- A failed Razorpay order can be retried, so the same order is reused.
  select * into v_payment from public.payments
  where charge_id = p_charge_id and amount_paise = v_due order by created_at desc limit 1;
  if found then
    update public.payments set status = 'created', failure_reason = null, updated_at = now()
    where id = v_payment.id returning * into v_payment;
  else
    insert into public.payments (org_id, charge_id, amount_paise)
    values (v_org.id, p_charge_id, v_due) returning * into v_payment;
  end if;
  return jsonb_build_object('status', 'pending', 'paymentId', v_payment.id, 'amountPaise', v_due,
    'providerOrderId', v_payment.provider_order_id);
end;
$$;

-- The first order recorded wins, so a double click cannot split one payment across two orders.
create function public.record_provider_order(p_payment_id uuid, p_provider_order_id text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organisations := private.billing_org();
  v_payment public.payments;
begin
  select * into v_payment from public.payments where id = p_payment_id and org_id = v_org.id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_payment.status <> 'created' then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  if v_payment.provider_order_id is not null then
    return v_payment.provider_order_id;
  end if;
  update public.payments set provider_order_id = p_provider_order_id, updated_at = now() where id = p_payment_id;
  return p_provider_order_id;
end;
$$;

-- The only path that marks a payment paid. Only webhooks and reconciliation can call it.
create function public.apply_payment_event(
  p_event_id text, p_event_type text, p_provider_order_id text, p_provider_payment_id text,
  p_amount_paise bigint, p_failure_reason text
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_payment public.payments;
  v_result text;
begin
  if p_event_id is not null then
    insert into public.webhook_events (provider, event_id, event_type) values ('razorpay', p_event_id, p_event_type)
    on conflict (provider, event_id) do nothing;
    if not found then
      return 'duplicate';
    end if;
  end if;

  select * into v_payment from public.payments where provider_order_id = p_provider_order_id for update;
  if not found then
    v_result := 'unknown_order';
  elsif v_payment.status = 'paid' then
    v_result := 'already_paid';
  elsif p_event_type in ('payment.captured', 'order.paid') then
    if p_amount_paise <> v_payment.amount_paise then
      update public.payments set failure_reason = 'Amount did not match', updated_at = now() where id = v_payment.id;
      v_result := 'amount_mismatch';
    else
      update public.payments set status = 'paid', provider_payment_id = p_provider_payment_id,
        failure_reason = null, updated_at = now()
      where id = v_payment.id;
      v_result := case when private.settle_charge(v_payment.charge_id) then 'paid' else 'charge_already_settled' end;
    end if;
  elsif p_event_type = 'payment.failed' then
    update public.payments set status = 'failed', failure_reason = left(p_failure_reason, 200), updated_at = now()
    where id = v_payment.id;
    v_result := 'failed';
  else
    v_result := 'ignored';
  end if;

  if p_event_id is not null then
    update public.webhook_events set processed_at = now(),
      error = case when v_result in ('unknown_order', 'amount_mismatch', 'charge_already_settled') then v_result end
    where provider = 'razorpay' and event_id = p_event_id;
  end if;
  return v_result;
end;
$$;

create function public.wallet_summary() returns table (available_paise bigint, on_hold_paise bigint, paid_paise bigint)
language sql stable security definer set search_path = '' as $$
  select
    coalesce(sum(amount_paise) filter (where to_bucket = 'available'), 0)
      - coalesce(sum(amount_paise) filter (where from_bucket = 'available'), 0),
    coalesce(sum(amount_paise) filter (where to_bucket = 'on_hold'), 0)
      - coalesce(sum(amount_paise) filter (where from_bucket = 'on_hold'), 0),
    coalesce(sum(amount_paise) filter (where to_bucket = 'paid'), 0)
      - coalesce(sum(amount_paise) filter (where from_bucket = 'paid'), 0)
  from public.wallet_entries where org_id = public.current_org_id();
$$;

create function public.unresolved_payments() returns table (id uuid, provider_order_id text)
language sql stable security definer set search_path = '' as $$
  select id, provider_order_id from public.payments
  where status = 'created' and provider_order_id is not null
    and created_at between now() - interval '3 days' and now() - interval '15 minutes'
  order by created_at limit 100;
$$;

create function public.claim_outbox(p_limit integer) returns table (
  id uuid, template text, payload jsonb, email text
)
language sql security definer set search_path = '' as $$
  with due as (
    select o.id from public.outbox o
    where o.status = 'pending' and o.next_attempt_at <= now()
    order by o.next_attempt_at limit least(p_limit, 50)
    for update of o skip locked
  )
  update public.outbox o
  set attempts = o.attempts + 1, next_attempt_at = now() + interval '15 minutes'
  from due, public.profiles p
  where o.id = due.id and p.user_id = o.recipient_user_id
  returning o.id, o.template, o.payload, p.email;
$$;

create function public.finish_outbox(p_id uuid, p_error text) returns void
language sql security definer set search_path = '' as $$
  update public.outbox
  set status = case when p_error is null then 'sent' when attempts >= 5 then 'failed' else 'pending' end,
    last_error = left(p_error, 200)
  where id = p_id;
$$;

-- An expired seller returns to pending payment, which hides listings until renewal.
create function public.expire_subscriptions() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_expired integer;
begin
  perform private.notify_org(s.org_id, 'subscription_expiring', 'subscription_expiring:' || s.id,
    jsonb_build_object('endsOn', s.ends_on))
  from public.subscriptions s
  where s.status = 'active' and s.ends_on between v_today and v_today + 30;

  update public.organisations o set status = 'pending_payment'
  from public.subscriptions s
  where s.org_id = o.id and s.status = 'active' and s.ends_on < v_today and o.status = 'active';
  update public.subscriptions set status = 'expired' where status = 'active' and ends_on < v_today;
  get diagnostics v_expired = row_count;
  return v_expired;
end;
$$;

create function public.admin_save_settings(
  p_direct_fee_bps integer, p_tender_fee_bps integer, p_gst_bps integer, p_tds_bps integer,
  p_subscription_base_paise bigint, p_subscription_step_paise bigint, p_free_subscription_sellers integer,
  p_reason text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.platform_settings := private.current_settings();
begin
  perform private.require_admin();
  if nullif(trim(p_reason), '') is null then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  v_row.id := gen_random_uuid();
  v_row.effective_from := now();
  v_row.created_by := auth.uid();
  v_row.direct_fee_bps := p_direct_fee_bps;
  v_row.tender_fee_bps := p_tender_fee_bps;
  v_row.gst_bps := p_gst_bps;
  v_row.tds_bps := p_tds_bps;
  v_row.subscription_base_paise := p_subscription_base_paise;
  v_row.subscription_step_paise := p_subscription_step_paise;
  v_row.free_subscription_sellers := p_free_subscription_sellers;
  insert into public.platform_settings values (v_row.*);
  perform private.audit_admin('platform_settings', v_row.id::text, 'settings.changed', trim(p_reason));
  return v_row.id;
end;
$$;

revoke all on function public.quote_subscription, public.start_subscription, public.begin_checkout, public.wallet_summary,
  public.record_provider_order, public.apply_payment_event, public.unresolved_payments, public.claim_outbox,
  public.finish_outbox, public.expire_subscriptions, public.admin_save_settings from public, anon, authenticated;
grant execute on function public.quote_subscription, public.start_subscription, public.begin_checkout, public.wallet_summary,
  public.record_provider_order, public.admin_save_settings to authenticated;
grant execute on function public.apply_payment_event, public.unresolved_payments, public.claim_outbox,
  public.finish_outbox, public.expire_subscriptions to service_role;
