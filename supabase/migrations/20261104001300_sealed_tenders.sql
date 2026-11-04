-- Sealed bid tenders: creation, publishing fees, bids, closing, the award chain and tender orders.
create type public.tender_type as enum ('bid', 'ra', 'bid_to_ra');
create type public.tender_kind as enum ('regular', 'custom');
create type public.tender_status as enum (
  'draft', 'unpaid', 'bidding', 'evaluating', 'shortlisting', 'auction_scheduled', 'auction', 'awarding', 'ordered', 'cancelled'
);
create type public.award_status as enum ('pending', 'offered', 'accepted', 'rejected', 'expired');

create table public.tenders (
  id uuid primary key default gen_random_uuid(),
  tender_no text not null unique,
  buyer_org_id uuid not null references public.organisations (id),
  type public.tender_type not null default 'bid',
  kind public.tender_kind not null,
  status public.tender_status not null default 'draft',
  product_id uuid references public.products (id),
  category_id uuid not null references public.categories (id),
  title text not null,
  quantity numeric(14, 3) not null check (quantity > 0),
  unit text not null,
  estimate_unit_paise bigint not null check (estimate_unit_paise > 0),
  payment_terms public.payment_terms not null,
  credit_days integer check (credit_days > 0),
  consignee_name text not null,
  consignee_gstin text not null check (consignee_gstin ~ '^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$'),
  consignee_address_id uuid not null references public.org_addresses (id),
  delivery_state_code char(2) not null,
  contract_months integer not null check (contract_months > 0),
  bid_starts_at timestamptz,
  bid_ends_at timestamptz not null,
  min_bids integer not null default 1 check (min_bids >= 1),
  extensions_allowed integer not null default 0 check (extensions_allowed >= 0),
  extensions_used integer not null default 0,
  extension_minutes integer not null default 1440 check (extension_minutes > 0),
  cancel_reason text,
  settings_id uuid not null references public.platform_settings (id),
  created_at timestamptz not null default now(),
  check ((payment_terms = 'credit') = (credit_days is not null)),
  check ((kind = 'regular') = (product_id is not null))
);
create index tenders_buyer_idx on public.tenders (buyer_org_id, created_at desc);
create index tenders_open_idx on public.tenders (status, bid_ends_at);
create index tenders_category_idx on public.tenders (category_id);

create table public.tender_specs (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references public.tenders (id),
  spec_definition_id uuid references public.spec_definitions (id),
  label text not null,
  value text not null,
  unit text,
  is_key boolean not null default false
);
create index tender_specs_tender_idx on public.tender_specs (tender_id);

create table public.tender_participants (
  tender_id uuid not null references public.tenders (id),
  seller_org_id uuid not null references public.organisations (id),
  attempts_used integer not null default 0 check (attempts_used between 0 and 3),
  last_bid_paise bigint,
  last_bid_at timestamptz,
  withdrawn boolean not null default false,
  declined_at timestamptz,
  primary key (tender_id, seller_org_id)
);
create index tender_participants_seller_idx on public.tender_participants (seller_org_id);

create table public.bids (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references public.tenders (id),
  seller_org_id uuid not null references public.organisations (id),
  phase text not null default 'sealed' check (phase in ('sealed', 'auction')),
  unit_paise bigint not null check (unit_paise > 0),
  withdrawn_at timestamptz,
  idempotency_key text,
  placed_at timestamptz not null default now(),
  unique (seller_org_id, idempotency_key)
);
create index bids_tender_idx on public.bids (tender_id, seller_org_id, placed_at desc);

create table public.tender_awards (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references public.tenders (id),
  seller_org_id uuid not null references public.organisations (id),
  rank integer not null,
  unit_paise bigint not null,
  status public.award_status not null,
  offered_at timestamptz,
  expires_at timestamptz,
  responded_at timestamptz,
  reject_reason text,
  unique (tender_id, seller_org_id)
);
create unique index tender_awards_one_open on public.tender_awards (tender_id) where status in ('pending', 'offered');
create index tender_awards_due_idx on public.tender_awards (expires_at) where status = 'offered';

alter table public.fee_charges add constraint fee_charges_tender_fkey foreign key (tender_id) references public.tenders (id);
create unique index fee_charges_one_per_tender_kind on public.fee_charges (tender_id, kind, org_id) where tender_id is not null;
alter table public.orders add constraint orders_tender_fkey foreign key (tender_id) references public.tenders (id);

-- A sealed bid never changes. It can only be marked withdrawn, once.
create function private.protect_bid() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' or old.withdrawn_at is not null or new.withdrawn_at is null
    or (to_jsonb(new) - 'withdrawn_at') <> (to_jsonb(old) - 'withdrawn_at') then
    raise exception 'Bids are append-only';
  end if;
  return new;
end;
$$;
create trigger bids_append_only before update or delete on public.bids
  for each row execute function private.protect_bid();

alter table public.tenders enable row level security;
alter table public.tender_specs enable row level security;
alter table public.tender_participants enable row level security;
alter table public.bids enable row level security;
alter table public.tender_awards enable row level security;
-- No direct access. Every read goes through a function that returns allow-listed fields.
revoke all on public.tenders, public.tender_specs, public.tender_participants, public.bids, public.tender_awards
  from anon, authenticated;

drop function private.create_charge(uuid, public.charge_kind, uuid, bigint, integer, public.platform_settings, uuid);

-- Same state means CGST and SGST. Another state means IGST. The odd paisa goes to SGST.
create function private.create_charge(
  p_org_id uuid, p_kind public.charge_kind, p_subscription_id uuid, p_base_paise bigint, p_rate_bps integer,
  p_settings public.platform_settings, p_order_id uuid default null, p_tender_id uuid default null
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
    org_id, kind, subscription_id, order_id, tender_id, base_paise, rate_bps, fee_paise, cgst_paise, sgst_paise, igst_paise,
    tds_paise, total_paise, settings_id
  ) values (
    p_org_id, p_kind, p_subscription_id, p_order_id, p_tender_id, p_base_paise, p_rate_bps, v_fee, v_cgst, v_sgst, v_igst,
    v_tds, v_fee + v_gst - v_tds, p_settings.id
  ) returning id into v_id;
  return v_id;
end;
$$;

create function private.create_tender_charge(
  p_tender public.tenders, p_org_id uuid, p_kind public.charge_kind, p_base_paise bigint, p_rate_bps integer
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_settings public.platform_settings;
  v_id uuid;
  v_total bigint;
begin
  select * into v_settings from public.platform_settings where id = p_tender.settings_id;
  v_id := private.create_charge(p_org_id, p_kind, null, p_base_paise, p_rate_bps, v_settings, null, p_tender.id);
  select total_paise into v_total from public.fee_charges where id = v_id;
  if v_total = 0 then
    perform private.settle_charge(v_id);
  end if;
  return v_id;
end;
$$;

create function private.cancel_tender(p_tender_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_tender public.tenders;
  v_charge_id uuid;
begin
  update public.tenders set status = 'cancelled', cancel_reason = p_reason where id = p_tender_id returning * into v_tender;
  for v_charge_id in select id from public.fee_charges where tender_id = p_tender_id loop
    perform private.release_charge(v_charge_id);
  end loop;
  perform private.notify_org(v_tender.buyer_org_id, 'tender_update', 'tender_cancelled:' || p_tender_id,
    jsonb_build_object('tenderNo', v_tender.tender_no));
end;
$$;

-- Offers the award to the lowest remaining bid. Ties go to the earlier bid.
create function private.offer_next_award(p_tender_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_tender public.tenders;
  v_settings public.platform_settings;
  v_participant public.tender_participants;
  v_rank integer;
begin
  select * into v_tender from public.tenders where id = p_tender_id for update;
  select * into v_settings from public.platform_settings where id = v_tender.settings_id;
  select * into v_participant from public.tender_participants p
  where p.tender_id = p_tender_id and p.last_bid_paise is not null and not p.withdrawn and p.declined_at is null
    and not exists (select from public.tender_awards a where a.tender_id = p_tender_id and a.seller_org_id = p.seller_org_id)
  order by p.last_bid_paise, p.last_bid_at limit 1;
  if not found then
    perform private.cancel_tender(p_tender_id, 'No seller accepted the award');
    return;
  end if;
  select count(*) + 1 into v_rank from public.tender_awards where tender_id = p_tender_id;
  insert into public.tender_awards (tender_id, seller_org_id, rank, unit_paise, status, offered_at, expires_at)
  values (p_tender_id, v_participant.seller_org_id, v_rank, v_participant.last_bid_paise, 'offered', now(),
    now() + make_interval(hours => v_settings.award_window_hours));
  perform private.notify_org(v_participant.seller_org_id, 'tender_update', 'tender_award:' || p_tender_id || ':' || v_rank,
    jsonb_build_object('tenderNo', v_tender.tender_no));
end;
$$;

create function private.create_tender_order(p_tender public.tenders, p_award public.tender_awards) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_address public.org_addresses;
  v_order_id uuid;
begin
  select * into v_address from public.org_addresses where id = p_tender.consignee_address_id;
  insert into public.orders (
    order_no, source, tender_id, product_id, buyer_org_id, seller_org_id, title, unit, spec_snapshot, quantity, unit_paise,
    total_paise, payment_terms, credit_days, consignee_name, consignee_gstin, delivery_address, status,
    contacts_unlocked_at, settings_id
  ) values (
    private.next_order_no(private.financial_year()), 'tender', p_tender.id, p_tender.product_id, p_tender.buyer_org_id,
    p_award.seller_org_id, p_tender.title, p_tender.unit, coalesce((
      select jsonb_agg(jsonb_build_object('label', s.label, 'value', s.value, 'unit', s.unit) order by s.is_key desc, s.label)
      from public.tender_specs s where s.tender_id = p_tender.id
    ), '[]'::jsonb), p_tender.quantity, p_award.unit_paise, round(p_award.unit_paise * p_tender.quantity),
    p_tender.payment_terms, p_tender.credit_days, p_tender.consignee_name, p_tender.consignee_gstin,
    jsonb_build_object('line1', v_address.line1, 'line2', v_address.line2, 'city', v_address.city,
      'stateCode', v_address.state_code, 'pincode', v_address.pincode),
    'accepted', now(), p_tender.settings_id
  ) returning id into v_order_id;
  perform private.order_event(v_order_id, 'accepted', 'Created from tender ' || p_tender.tender_no);
  update public.tenders set status = 'ordered' where id = p_tender.id;
  update public.tender_awards set status = 'accepted', responded_at = now() where id = p_award.id;
  perform private.notify_org(p_tender.buyer_org_id, 'order_update', 'order_accepted:' || v_order_id,
    jsonb_build_object('orderNo', p_tender.tender_no, 'status', 'accepted'));
end;
$$;

-- Each fee kind moves its order or tender forward once the money is held.
create function private.apply_held_charge(p_charge public.fee_charges) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
  v_tender public.tenders;
  v_award public.tender_awards;
begin
  if p_charge.kind = 'direct_buyer' then
    select * into v_order from public.orders where id = p_charge.order_id for update;
    update public.orders set status = 'awaiting_seller' where id = v_order.id;
    perform private.order_event(v_order.id, 'awaiting_seller', 'Buyer fee received');
    perform private.notify_org(v_order.seller_org_id, 'order_update', 'order_placed:' || v_order.id,
      jsonb_build_object('orderNo', v_order.order_no, 'status', 'awaiting_seller'));
  elsif p_charge.kind = 'direct_seller' then
    select * into v_order from public.orders where id = p_charge.order_id for update;
    update public.orders set status = 'accepted', contacts_unlocked_at = now() where id = v_order.id;
    perform private.order_event(v_order.id, 'accepted', 'Seller fee received');
    perform private.notify_org(v_order.buyer_org_id, 'order_update', 'order_accepted:' || v_order.id,
      jsonb_build_object('orderNo', v_order.order_no, 'status', 'accepted'));
  else
    select * into v_tender from public.tenders where id = p_charge.tender_id for update;
    if p_charge.kind in ('tender_buyer', 'tender_deposit') then
      -- A late payment still gets a full day of bidding.
      update public.tenders set status = 'bidding', bid_starts_at = now(),
        bid_ends_at = greatest(bid_ends_at, now() + interval '1 day')
      where id = v_tender.id;
    elsif p_charge.kind = 'tender_balance' then
      update public.tender_awards set status = 'offered', offered_at = now(),
        expires_at = now() + make_interval(hours => (
          select award_window_hours from public.platform_settings where id = v_tender.settings_id
        ))
      where tender_id = v_tender.id and status = 'pending';
    elsif p_charge.kind = 'tender_seller' then
      select * into v_award from public.tender_awards
      where tender_id = v_tender.id and seller_org_id = p_charge.org_id and status = 'offered' for update;
      perform private.create_tender_order(v_tender, v_award);
    end if;
  end if;
end;
$$;

create or replace function private.settle_charge(p_charge_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_charge public.fee_charges;
  v_held bigint;
begin
  select * into v_charge from public.fee_charges where id = p_charge_id for update;
  if v_charge.status <> 'pending' then
    return false;
  end if;
  v_held := private.held_paise(p_charge_id);

  if v_charge.kind <> 'subscription' then
    if v_charge.total_paise > v_held then
      insert into public.wallet_entries (org_id, charge_id, to_bucket, amount_paise, reason)
      values (v_charge.org_id, p_charge_id, 'on_hold', v_charge.total_paise - v_held, 'Fee held until the order completes');
    end if;
    update public.fee_charges set status = 'held' where id = p_charge_id;
    perform private.apply_held_charge(v_charge);
    perform private.audit_billing(v_charge.org_id, p_charge_id, 'charge.held',
      jsonb_build_object('kind', v_charge.kind, 'totalPaise', v_charge.total_paise));
    return true;
  end if;

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
  perform private.activate_subscription(v_charge.subscription_id);
  perform private.audit_billing(v_charge.org_id, p_charge_id, 'charge.paid',
    jsonb_build_object('kind', v_charge.kind, 'totalPaise', v_charge.total_paise));
  perform private.notify_org(v_charge.org_id, 'charge_paid', 'charge_paid:' || p_charge_id,
    jsonb_build_object('kind', v_charge.kind, 'totalPaise', v_charge.total_paise));
  return true;
end;
$$;

create or replace function public.receive_order(p_id uuid, p_file_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders := private.party_order(p_id, 'buyer');
  v_charge_id uuid;
begin
  if v_order.status <> 'dispatched' then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  if not exists (
    select from public.files
    where id = p_file_id and owner_org_id = v_order.buyer_org_id and mime_type = 'image/webp'
  ) then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  insert into public.order_documents (order_id, kind, file_id) values (p_id, 'delivery_proof', p_file_id);
  update public.orders set status = 'completed' where id = p_id;
  update public.products set order_count = order_count + 1 where id = v_order.product_id;
  perform private.order_event(p_id, 'completed', 'Buyer confirmed receipt');
  for v_charge_id in
    select id from public.fee_charges
    where order_id = p_id or (v_order.tender_id is not null and tender_id = v_order.tender_id)
  loop
    perform private.finish_charge(v_charge_id);
  end loop;
  perform private.notify_org(v_order.seller_org_id, 'order_update', 'order_completed:' || p_id,
    jsonb_build_object('orderNo', v_order.order_no, 'status', 'completed'));
end;
$$;

create function private.next_tender_no(p_financial_year text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_value bigint;
begin
  insert into public.number_sequences (name, financial_year, next_value)
  values ('tender', p_financial_year, 2)
  on conflict (name, financial_year) do update set next_value = public.number_sequences.next_value + 1
  returning next_value - 1 into v_value;
  return 'BM/' || substr(p_financial_year, 3, 2) || '/BID/' || lpad(v_value::text, 5, '0');
end;
$$;

-- Only sealed bid tenders can be created until Phases 7 and 8 add the auction types.
create function public.create_tender(
  p_kind public.tender_kind, p_product_id uuid, p_category_id uuid, p_title text, p_unit text, p_quantity numeric,
  p_estimate_unit_paise bigint, p_specs jsonb, p_payment_terms public.payment_terms, p_credit_days integer,
  p_consignee_name text, p_consignee_gstin text, p_consignee_address_id uuid, p_contract_months integer,
  p_bid_ends_at timestamptz, p_min_bids integer, p_extensions_allowed integer, p_extension_minutes integer
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_buyer public.organisations := private.active_buyer();
  v_product public.products;
  v_address public.org_addresses;
  v_category_id uuid := p_category_id;
  v_title text := trim(p_title);
  v_unit text := trim(p_unit);
  v_estimate bigint := p_estimate_unit_paise;
  v_id uuid;
begin
  select * into v_address from public.org_addresses where id = p_consignee_address_id and org_id = v_buyer.id;
  if not found or p_bid_ends_at < now() + interval '1 day' or nullif(trim(p_consignee_name), '') is null
    or (p_payment_terms = 'credit') <> (coalesce(p_credit_days, 0) > 0) then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;

  if p_kind = 'regular' then
    select * into v_product from public.products where id = p_product_id and status = 'published';
    if not found then
      raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;
    v_category_id := v_product.category_id;
    v_title := v_product.title;
    v_unit := v_product.unit;
    v_estimate := v_product.net_paise;
  elsif v_estimate is null or nullif(v_title, '') is null or nullif(v_unit, '') is null
    or not exists (select from public.categories where id = v_category_id and is_active) then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;

  begin
    insert into public.tenders (
      tender_no, buyer_org_id, kind, product_id, category_id, title, quantity, unit, estimate_unit_paise, payment_terms,
      credit_days, consignee_name, consignee_gstin, consignee_address_id, delivery_state_code, contract_months,
      bid_ends_at, min_bids, extensions_allowed, extension_minutes, settings_id
    ) values (
      private.next_tender_no(private.financial_year()), v_buyer.id, p_kind, case when p_kind = 'regular' then p_product_id end,
      v_category_id, v_title, p_quantity, v_unit, v_estimate, p_payment_terms,
      case when p_payment_terms = 'credit' then p_credit_days end, trim(p_consignee_name), upper(trim(p_consignee_gstin)),
      p_consignee_address_id, v_address.state_code, p_contract_months, p_bid_ends_at, p_min_bids, p_extensions_allowed,
      p_extension_minutes, (private.current_settings()).id
    ) returning id into v_id;
  exception when check_violation then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end;

  if p_kind = 'regular' then
    insert into public.tender_specs (tender_id, spec_definition_id, label, value, unit, is_key)
    select v_id, d.id, d.label, coalesce(v.value_text, v.value_number::text), d.unit, d.is_key
    from public.product_spec_values v
    join public.spec_definitions d on d.id = v.spec_definition_id
    where v.product_id = p_product_id;
  else
    insert into public.tender_specs (tender_id, label, value, unit)
    select v_id, trim(item ->> 'label'), trim(item ->> 'value'), nullif(trim(item ->> 'unit'), '')
    from jsonb_array_elements(coalesce(p_specs, '[]'::jsonb)) as item
    where nullif(trim(item ->> 'label'), '') is not null and nullif(trim(item ->> 'value'), '') is not null;
  end if;
  perform private.audit_billing(v_buyer.id, v_id, 'tender.created');
  return v_id;
end;
$$;

create function private.own_tender(p_id uuid) returns public.tenders
language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organisations := private.billing_org();
  v_tender public.tenders;
begin
  select * into v_tender from public.tenders where id = p_id and buyer_org_id = v_org.id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  return v_tender;
end;
$$;

create function public.publish_tender(p_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_tender public.tenders := private.own_tender(p_id);
  v_settings public.platform_settings;
  v_charge_id uuid;
begin
  select id into v_charge_id from public.fee_charges where tender_id = p_id and org_id = v_tender.buyer_org_id
    and kind in ('tender_buyer', 'tender_deposit');
  if found then
    return v_charge_id;
  end if;
  if v_tender.status <> 'draft' then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  select * into v_settings from public.platform_settings where id = v_tender.settings_id;
  update public.tenders set status = 'unpaid' where id = p_id;
  if v_tender.kind = 'custom' then
    return private.create_tender_charge(v_tender, v_tender.buyer_org_id, 'tender_deposit', v_settings.custom_deposit_paise, 10000);
  end if;
  return private.create_tender_charge(v_tender, v_tender.buyer_org_id, 'tender_buyer',
    round(v_tender.estimate_unit_paise * v_tender.quantity)::bigint, v_settings.tender_fee_bps);
end;
$$;

create function public.cancel_tender(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_tender public.tenders := private.own_tender(p_id);
begin
  if v_tender.status not in ('draft', 'unpaid') then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  perform private.cancel_tender(p_id, 'Cancelled by buyer: ' || left(trim(p_reason), 300));
end;
$$;

-- Eligibility needs one published product that fits the category, state and key specifications.
create function private.seller_can_bid(p_seller public.organisations, p_tender public.tenders) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_seller.kind = 'seller' and p_seller.status = 'active' and not p_seller.maintenance
    and coalesce(p_seller.blocked_until, '-infinity') <= now()
    and exists (
      select from public.products p
      join public.categories c on c.id = p.category_id
      join public.product_states ps on ps.product_id = p.id and ps.state_code = p_tender.delivery_state_code
      where p.seller_org_id = p_seller.id and p.status = 'published'
        and p_tender.category_id in (c.id, c.parent_id)
        and not exists (
          select from public.tender_specs s
          where s.tender_id = p_tender.id and s.is_key and s.spec_definition_id is not null and not exists (
            select from public.product_spec_values v
            where v.product_id = p.id and v.spec_definition_id = s.spec_definition_id
              and coalesce(v.value_text, v.value_number::text) = s.value
          )
        )
    );
$$;

create function private.locked_open_tender(p_id uuid) returns public.tenders
language plpgsql security definer set search_path = '' as $$
declare
  v_tender public.tenders;
begin
  select * into v_tender from public.tenders where id = p_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  -- Server time decides, so a slow tick job can never admit a late bid.
  if v_tender.status <> 'bidding' or now() >= v_tender.bid_ends_at then
    raise exception 'TENDER_CLOSED' using errcode = 'P0001';
  end if;
  return v_tender;
end;
$$;

create function public.submit_bid(p_id uuid, p_unit_paise bigint) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_seller public.organisations := private.billing_org();
  v_tender public.tenders := private.locked_open_tender(p_id);
  v_participant public.tender_participants;
  v_bid_id uuid;
begin
  if p_unit_paise <= 0 then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if not private.seller_can_bid(v_seller, v_tender) then
    raise exception 'NOT_ELIGIBLE' using errcode = 'P0001';
  end if;
  insert into public.tender_participants (tender_id, seller_org_id) values (p_id, v_seller.id)
  on conflict (tender_id, seller_org_id) do nothing;
  select * into v_participant from public.tender_participants
  where tender_id = p_id and seller_org_id = v_seller.id for update;
  if v_participant.attempts_used >= 3 then
    raise exception 'LIMIT_EXCEEDED' using errcode = 'P0001';
  end if;

  update public.bids set withdrawn_at = now()
  where tender_id = p_id and seller_org_id = v_seller.id and withdrawn_at is null;
  insert into public.bids (tender_id, seller_org_id, unit_paise) values (p_id, v_seller.id, p_unit_paise)
  returning id into v_bid_id;
  update public.tender_participants
  set attempts_used = attempts_used + 1, last_bid_paise = p_unit_paise, last_bid_at = now(), withdrawn = false
  where tender_id = p_id and seller_org_id = v_seller.id;
  return v_bid_id;
end;
$$;

create function public.withdraw_bid(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_seller public.organisations := private.billing_org();
  v_tender public.tenders := private.locked_open_tender(p_id);
begin
  update public.bids set withdrawn_at = now()
  where tender_id = p_id and seller_org_id = v_seller.id and withdrawn_at is null;
  if not found then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  update public.tender_participants set withdrawn = true, last_bid_paise = null, last_bid_at = null
  where tender_id = p_id and seller_org_id = v_seller.id;
end;
$$;

-- Closed means past the deadline with enough bids, whether or not the tick job has run.
create function public.tender_bids(p_id uuid) returns table (rank bigint, unit_paise bigint, total_paise bigint, placed_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_tender public.tenders;
begin
  select * into v_tender from public.tenders where id = p_id and buyer_org_id = public.current_org_id();
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if now() < v_tender.bid_ends_at or v_tender.status not in ('evaluating', 'awarding', 'ordered') then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  return query
    select row_number() over (order by p.last_bid_paise, p.last_bid_at), p.last_bid_paise,
      round(p.last_bid_paise * v_tender.quantity)::bigint, p.last_bid_at
    from public.tender_participants p
    where p.tender_id = p_id and p.last_bid_paise is not null and not p.withdrawn
    order by 1;
end;
$$;

-- Chooses by rank, so the buyer never needs a seller's identity to award.
create function public.award_tender(p_id uuid, p_rank integer) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_tender public.tenders := private.own_tender(p_id);
  v_settings public.platform_settings;
  v_participant public.tender_participants;
  v_fee bigint;
  v_deposit bigint;
  v_balance bigint;
begin
  if v_tender.status <> 'evaluating' then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  select * into v_participant from public.tender_participants p
  where p.tender_id = p_id and p.last_bid_paise is not null and not p.withdrawn
  order by p.last_bid_paise, p.last_bid_at offset greatest(p_rank - 1, 0) limit 1;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  update public.tenders set status = 'awarding' where id = p_id;
  select * into v_settings from public.platform_settings where id = v_tender.settings_id;

  if v_tender.kind = 'custom' then
    v_fee := round(round(v_participant.last_bid_paise * v_tender.quantity) * v_settings.tender_fee_bps / 10000.0);
    select fee_paise into v_deposit from public.fee_charges where tender_id = p_id and kind = 'tender_deposit';
    v_balance := greatest(v_fee - v_deposit, 0);
    if v_balance > 0 then
      insert into public.tender_awards (tender_id, seller_org_id, rank, unit_paise, status)
      values (p_id, v_participant.seller_org_id, 1, v_participant.last_bid_paise, 'pending');
      return private.create_tender_charge(v_tender, v_tender.buyer_org_id, 'tender_balance', v_balance, 10000);
    end if;
  end if;

  insert into public.tender_awards (tender_id, seller_org_id, rank, unit_paise, status, offered_at, expires_at)
  values (p_id, v_participant.seller_org_id, 1, v_participant.last_bid_paise, 'offered', now(),
    now() + make_interval(hours => v_settings.award_window_hours));
  perform private.notify_org(v_participant.seller_org_id, 'tender_update', 'tender_award:' || p_id || ':1',
    jsonb_build_object('tenderNo', v_tender.tender_no));
  return null;
end;
$$;

create function private.open_award(p_id uuid, p_seller_org_id uuid) returns public.tender_awards
language plpgsql security definer set search_path = '' as $$
declare
  v_award public.tender_awards;
begin
  select * into v_award from public.tender_awards
  where tender_id = p_id and seller_org_id = p_seller_org_id and status = 'offered' for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_award.expires_at <= now() then
    raise exception 'TENDER_CLOSED' using errcode = 'P0001';
  end if;
  return v_award;
end;
$$;

create function public.accept_award(p_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_seller public.organisations := private.billing_org();
  v_award public.tender_awards := private.open_award(p_id, v_seller.id);
  v_tender public.tenders;
  v_settings public.platform_settings;
  v_charge_id uuid;
begin
  select * into v_tender from public.tenders where id = p_id;
  select id into v_charge_id from public.fee_charges
  where tender_id = p_id and kind = 'tender_seller' and org_id = v_seller.id;
  if found then
    return v_charge_id;
  end if;
  select * into v_settings from public.platform_settings where id = v_tender.settings_id;
  return private.create_tender_charge(v_tender, v_seller.id, 'tender_seller',
    round(v_award.unit_paise * v_tender.quantity)::bigint, v_settings.tender_fee_bps);
end;
$$;

-- The strike ladder from D-8: 30, 60 and 180 days, then permanent. Strikes reset after 12 months.
create function private.apply_rejection_strike(p_org_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organisations;
  v_strikes integer;
begin
  select * into v_org from public.organisations where id = p_org_id for update;
  v_strikes := case when v_org.strikes_reset_at < now() - interval '12 months' then 0 else v_org.strike_count end + 1;
  update public.organisations set strike_count = v_strikes, strikes_reset_at = now(),
    blocked_until = case v_strikes
      when 1 then now() + interval '30 days'
      when 2 then now() + interval '60 days'
      when 3 then now() + interval '180 days'
      else 'infinity'::timestamptz end
  where id = p_org_id;
  perform private.audit_billing(p_org_id, p_org_id, 'seller.strike', jsonb_build_object('strikes', v_strikes));
end;
$$;

create function public.reject_award(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_seller public.organisations := private.billing_org();
  v_award public.tender_awards := private.open_award(p_id, v_seller.id);
  v_charge_id uuid;
begin
  if nullif(trim(p_reason), '') is null then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  update public.tender_awards set status = 'rejected', responded_at = now(), reject_reason = left(trim(p_reason), 300)
  where id = v_award.id;
  update public.tender_participants set declined_at = now() where tender_id = p_id and seller_org_id = v_seller.id;
  select id into v_charge_id from public.fee_charges where tender_id = p_id and kind = 'tender_seller' and org_id = v_seller.id;
  if found then
    perform private.release_charge(v_charge_id);
  end if;
  perform private.apply_rejection_strike(v_seller.id);
  perform private.offer_next_award(p_id);
end;
$$;

-- Runs from the job route. Bid acceptance never depends on it.
create function public.tick_tenders() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_tender public.tenders;
  v_award public.tender_awards;
  v_charge_id uuid;
  v_changed integer := 0;
begin
  for v_tender in
    select * from public.tenders where status = 'bidding' and type = 'bid' and bid_ends_at <= now()
    for update skip locked
  loop
    if (
      select count(*) from public.tender_participants
      where tender_id = v_tender.id and last_bid_paise is not null and not withdrawn
    ) >= v_tender.min_bids then
      update public.tenders set status = 'evaluating' where id = v_tender.id;
      perform private.notify_org(v_tender.buyer_org_id, 'tender_update', 'tender_closed:' || v_tender.id,
        jsonb_build_object('tenderNo', v_tender.tender_no));
    elsif v_tender.extensions_used < v_tender.extensions_allowed then
      update public.tenders set extensions_used = extensions_used + 1,
        bid_ends_at = now() + make_interval(mins => extension_minutes)
      where id = v_tender.id;
    else
      perform private.cancel_tender(v_tender.id, 'Not enough bids after the last extension');
    end if;
    v_changed := v_changed + 1;
  end loop;

  for v_award in
    select * from public.tender_awards where status = 'offered' and expires_at <= now()
    for update skip locked
  loop
    update public.tender_awards set status = 'expired', responded_at = now() where id = v_award.id;
    select id into v_charge_id from public.fee_charges
    where tender_id = v_award.tender_id and kind = 'tender_seller' and org_id = v_award.seller_org_id;
    if found then
      perform private.release_charge(v_charge_id);
    end if;
    perform private.offer_next_award(v_award.tender_id);
    v_changed := v_changed + 1;
  end loop;

  for v_tender in
    select * from public.tenders where status = 'unpaid' and created_at < now() - interval '3 days'
    for update skip locked
  loop
    perform private.cancel_tender(v_tender.id, 'The fee was not paid in time');
    v_changed := v_changed + 1;
  end loop;
  return v_changed;
end;
$$;

create function public.public_tenders(p_limit integer default 20, p_offset integer default 0) returns table (
  id uuid, tender_no text, title text, category_name text, quantity numeric, unit text, delivery_state_code text,
  bid_ends_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select t.id, t.tender_no, t.title, c.name, t.quantity, t.unit, t.delivery_state_code::text, t.bid_ends_at
  from public.tenders t join public.categories c on c.id = t.category_id
  where t.status = 'bidding' and t.bid_ends_at > now()
  order by t.bid_ends_at
  limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0);
$$;

create function public.public_tender(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', t.id, 'tenderNo', t.tender_no, 'title', t.title, 'categoryName', c.name, 'quantity', t.quantity, 'unit', t.unit,
    'deliveryStateCode', t.delivery_state_code, 'bidEndsAt', t.bid_ends_at, 'contractMonths', t.contract_months,
    'paymentTerms', t.payment_terms, 'creditDays', t.credit_days,
    'specs', (
      select coalesce(jsonb_agg(jsonb_build_object('label', s.label, 'value', s.value, 'unit', s.unit) order by s.is_key desc, s.label), '[]'::jsonb)
      from public.tender_specs s where s.tender_id = t.id
    )
  )
  from public.tenders t join public.categories c on c.id = t.category_id
  where t.id = p_id and t.status = 'bidding' and t.bid_ends_at > now();
$$;

create function public.buyer_tenders() returns table (
  id uuid, tender_no text, title text, status public.tender_status, bid_ends_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select id, tender_no, title, status, bid_ends_at from public.tenders
  where buyer_org_id = public.current_org_id() order by created_at desc limit 50;
$$;

create function public.get_buyer_tender(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', t.id, 'tenderNo', t.tender_no, 'title', t.title, 'kind', t.kind, 'status', t.status, 'quantity', t.quantity,
    'unit', t.unit, 'estimateUnitPaise', t.estimate_unit_paise,
    'estimateTotalPaise', round(t.estimate_unit_paise * t.quantity)::bigint, 'bidEndsAt', t.bid_ends_at, 'minBids', t.min_bids,
    'extensionsUsed', t.extensions_used, 'extensionsAllowed', t.extensions_allowed, 'cancelReason', t.cancel_reason,
    'consigneeName', t.consignee_name, 'contractMonths', t.contract_months,
    'specs', (
      select coalesce(jsonb_agg(jsonb_build_object('label', s.label, 'value', s.value, 'unit', s.unit) order by s.is_key desc, s.label), '[]'::jsonb)
      from public.tender_specs s where s.tender_id = t.id
    ),
    'charge', (
      select jsonb_build_object('id', c.id, 'status', c.status, 'feePaise', c.fee_paise,
        'gstPaise', c.cgst_paise + c.sgst_paise + c.igst_paise, 'totalPaise', c.total_paise, 'kind', c.kind)
      from public.fee_charges c where c.tender_id = t.id and c.org_id = t.buyer_org_id
      order by c.created_at desc limit 1
    ),
    'orderId', (select o.id from public.orders o where o.tender_id = t.id),
    'awardStatus', (
      select a.status from public.tender_awards a where a.tender_id = t.id order by a.rank desc limit 1
    )
  )
  from public.tenders t where t.id = p_id and t.buyer_org_id = public.current_org_id();
$$;

create function public.seller_tenders() returns table (
  id uuid, tender_no text, title text, category_name text, quantity numeric, unit text, delivery_state_code text,
  bid_ends_at timestamptz, my_bid_paise bigint, award_status public.award_status
)
language sql stable security definer set search_path = '' as $$
  select t.id, t.tender_no, t.title, c.name, t.quantity, t.unit, t.delivery_state_code::text, t.bid_ends_at,
    p.last_bid_paise, a.status
  from public.tenders t
  join public.categories c on c.id = t.category_id
  join public.organisations o on o.id = public.current_org_id()
  left join public.tender_participants p on p.tender_id = t.id and p.seller_org_id = o.id
  left join public.tender_awards a on a.tender_id = t.id and a.seller_org_id = o.id
  where (t.status = 'bidding' and t.bid_ends_at > now() and private.seller_can_bid(o, t)) or p.seller_org_id is not null
  order by t.bid_ends_at desc limit 50;
$$;

-- A seller sees only their own bid. Rivals, their prices and their count are never returned.
create function public.get_seller_tender(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_org public.organisations;
  v_tender public.tenders;
  v_participant public.tender_participants;
  v_award public.tender_awards;
begin
  select * into v_org from public.organisations where id = public.current_org_id();
  select * into v_tender from public.tenders where id = p_id;
  if not found or v_org.id is null then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  select * into v_participant from public.tender_participants where tender_id = p_id and seller_org_id = v_org.id;
  if v_tender.status <> 'bidding' and v_participant.seller_org_id is null then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  select * into v_award from public.tender_awards where tender_id = p_id and seller_org_id = v_org.id;
  return jsonb_build_object(
    'id', v_tender.id, 'tenderNo', v_tender.tender_no, 'title', v_tender.title, 'open', v_tender.status = 'bidding' and now() < v_tender.bid_ends_at,
    'quantity', v_tender.quantity, 'unit', v_tender.unit, 'deliveryStateCode', v_tender.delivery_state_code,
    'bidEndsAt', v_tender.bid_ends_at, 'contractMonths', v_tender.contract_months, 'paymentTerms', v_tender.payment_terms,
    'creditDays', v_tender.credit_days, 'eligible', private.seller_can_bid(v_org, v_tender),
    'attemptsUsed', coalesce(v_participant.attempts_used, 0), 'myBidPaise', v_participant.last_bid_paise,
    'specs', (
      select coalesce(jsonb_agg(jsonb_build_object('label', s.label, 'value', s.value, 'unit', s.unit) order by s.is_key desc, s.label), '[]'::jsonb)
      from public.tender_specs s where s.tender_id = p_id
    ),
    'award', case when v_award.id is null or v_award.status = 'pending' then null else jsonb_build_object('status', v_award.status,
      'unitPaise', v_award.unit_paise, 'totalPaise', round(v_award.unit_paise * v_tender.quantity)::bigint, 'expiresAt', v_award.expires_at) end,
    'charge', (
      select jsonb_build_object('id', c.id, 'status', c.status, 'feePaise', c.fee_paise,
        'gstPaise', c.cgst_paise + c.sgst_paise + c.igst_paise, 'totalPaise', c.total_paise)
      from public.fee_charges c where c.tender_id = p_id and c.org_id = v_org.id
    ),
    'orderId', (select o.id from public.orders o where o.tender_id = p_id and o.seller_org_id = v_org.id)
  );
end;
$$;

revoke all on function public.create_tender, public.publish_tender, public.cancel_tender, public.submit_bid,
  public.withdraw_bid, public.tender_bids, public.award_tender, public.accept_award, public.reject_award,
  public.tick_tenders, public.public_tenders, public.public_tender, public.buyer_tenders, public.get_buyer_tender,
  public.seller_tenders, public.get_seller_tender from public, anon, authenticated;
grant execute on function public.create_tender, public.publish_tender, public.cancel_tender, public.submit_bid,
  public.withdraw_bid, public.tender_bids, public.award_tender, public.accept_award, public.reject_award,
  public.buyer_tenders, public.get_buyer_tender, public.seller_tenders, public.get_seller_tender to authenticated;
grant execute on function public.public_tenders, public.public_tender to anon, authenticated;
grant execute on function public.tick_tenders to service_role;
