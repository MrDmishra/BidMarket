-- Reverse auctions: the auction clock, one locked bid function, anti-sniping and masked live state.
alter table public.tenders
  add column ra_starts_at timestamptz,
  add column ra_ends_at timestamptz,
  add column snipe_extensions_used integer not null default 0,
  add column l1_paise bigint,
  add column bid_count integer not null default 0,
  add column seq bigint not null default 0,
  add constraint tenders_auction_dates check (type = 'bid' or (ra_starts_at is not null and ra_ends_at > ra_starts_at));
create index tenders_auction_due_idx on public.tenders (bid_ends_at) where status in ('auction_scheduled', 'auction');

drop function private.next_tender_no(text);
create function private.next_tender_no(p_financial_year text, p_label text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_value bigint;
begin
  insert into public.number_sequences (name, financial_year, next_value)
  values ('tender', p_financial_year, 2)
  on conflict (name, financial_year) do update set next_value = public.number_sequences.next_value + 1
  returning next_value - 1 into v_value;
  return 'BM/' || substr(p_financial_year, 3, 2) || '/' || p_label || '/' || lpad(v_value::text, 5, '0');
end;
$$;

drop function public.create_tender(public.tender_kind, uuid, uuid, text, text, numeric, bigint, jsonb, public.payment_terms,
  integer, text, text, uuid, integer, timestamptz, integer, integer, integer);
create function public.create_tender(
  p_kind public.tender_kind, p_product_id uuid, p_category_id uuid, p_title text, p_unit text, p_quantity numeric,
  p_estimate_unit_paise bigint, p_specs jsonb, p_payment_terms public.payment_terms, p_credit_days integer,
  p_consignee_name text, p_consignee_gstin text, p_consignee_address_id uuid, p_contract_months integer,
  p_bid_ends_at timestamptz, p_min_bids integer, p_extensions_allowed integer, p_extension_minutes integer,
  p_type public.tender_type default 'bid', p_ra_starts_at timestamptz default null, p_ra_ends_at timestamptz default null
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
  v_closes_at timestamptz := case when p_type = 'ra' then p_ra_ends_at else p_bid_ends_at end;
begin
  if p_type = 'bid_to_ra' or (p_type = 'ra' and (
    p_ra_starts_at is null or p_ra_starts_at < now() + interval '1 hour'
    or p_ra_ends_at is null or p_ra_ends_at < p_ra_starts_at + interval '15 minutes'
  )) then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  select * into v_address from public.org_addresses where id = p_consignee_address_id and org_id = v_buyer.id;
  if not found or v_closes_at is null or v_closes_at < now() + interval '1 hour'
    or (p_type = 'bid' and p_bid_ends_at < now() + interval '1 day') or nullif(trim(p_consignee_name), '') is null
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
      tender_no, buyer_org_id, type, kind, product_id, category_id, title, quantity, unit, estimate_unit_paise, payment_terms,
      credit_days, consignee_name, consignee_gstin, consignee_address_id, delivery_state_code, contract_months,
      bid_ends_at, ra_starts_at, ra_ends_at, min_bids, extensions_allowed, extension_minutes, settings_id
    ) values (
      private.next_tender_no(private.financial_year(), case when p_type = 'ra' then 'RA' else 'BID' end), v_buyer.id, p_type, p_kind, case when p_kind = 'regular' then p_product_id end,
      v_category_id, v_title, p_quantity, v_unit, v_estimate, p_payment_terms,
      case when p_payment_terms = 'credit' then p_credit_days end, trim(p_consignee_name), upper(trim(p_consignee_gstin)),
      p_consignee_address_id, v_address.state_code, p_contract_months, v_closes_at, case when p_type = 'ra' then p_ra_starts_at end,
      case when p_type = 'ra' then p_ra_ends_at end, p_min_bids, p_extensions_allowed,
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

-- Each fee kind moves its order or tender forward once the money is held.
create or replace function private.apply_held_charge(p_charge public.fee_charges) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
  v_tender public.tenders;
  v_award public.tender_awards;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
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
      if v_tender.type = 'ra' then
        -- A late payment moves the whole auction, so sellers still get notice and its full length.
        v_starts_at := greatest(v_tender.ra_starts_at, now() + interval '1 hour');
        v_ends_at := v_starts_at + (v_tender.ra_ends_at - v_tender.ra_starts_at);
        update public.tenders set status = 'auction_scheduled', ra_starts_at = v_starts_at, ra_ends_at = v_ends_at,
          bid_ends_at = v_ends_at
        where id = v_tender.id;
      else
        -- A late payment still gets a full day of bidding.
        update public.tenders set status = 'bidding', bid_starts_at = now(),
          bid_ends_at = greatest(bid_ends_at, now() + interval '1 day')
        where id = v_tender.id;
      end if;
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

create function private.close_tender_bidding(p_tender public.tenders) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (
    select count(*) from public.tender_participants
    where tender_id = p_tender.id and last_bid_paise is not null and not withdrawn
  ) >= p_tender.min_bids then
    update public.tenders set status = 'evaluating', seq = seq + 1 where id = p_tender.id;
    perform private.notify_org(p_tender.buyer_org_id, 'tender_update', 'tender_closed:' || p_tender.id,
      jsonb_build_object('tenderNo', p_tender.tender_no));
  elsif p_tender.extensions_used < p_tender.extensions_allowed then
    update public.tenders set extensions_used = extensions_used + 1, seq = seq + 1,
      bid_ends_at = now() + make_interval(mins => extension_minutes),
      ra_ends_at = case when type = 'bid' then null else now() + make_interval(mins => extension_minutes) end
    where id = p_tender.id;
  else
    perform private.cancel_tender(p_tender.id, 'Not enough bids after the last extension');
  end if;
end;
$$;

-- Runs from the job route. Bid acceptance never depends on it.
create or replace function public.tick_tenders() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_tender public.tenders;
  v_award public.tender_awards;
  v_charge_id uuid;
  v_changed integer := 0;
begin
  update public.tenders set status = 'auction', seq = seq + 1
  where status = 'auction_scheduled' and ra_starts_at <= now();

  for v_tender in
    select * from public.tenders
    where ((status = 'bidding' and type = 'bid') or status = 'auction') and bid_ends_at <= now()
    for update skip locked
  loop
    perform private.close_tender_bidding(v_tender);
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

-- The one path for auction bids. The row lock gives each tender one strict bid order, and
-- clock_timestamp runs after the lock, so time spent waiting for it counts against the bidder.
create function public.place_ra_bid(p_id uuid, p_unit_paise bigint, p_idempotency_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_seller public.organisations := private.billing_org();
  v_tender public.tenders;
  v_settings public.platform_settings;
  v_bid public.bids;
  v_now timestamptz;
  v_max_allowed bigint;
  v_extend boolean;
  v_rank bigint;
begin
  if p_unit_paise <= 0 or nullif(trim(p_idempotency_key), '') is null then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  select * into v_tender from public.tenders where id = p_id for update;
  if not found or v_tender.type = 'bid' then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  -- A retry returns the first result, even after the auction closes.
  select * into v_bid from public.bids where seller_org_id = v_seller.id and idempotency_key = p_idempotency_key;
  if not found then
    v_now := clock_timestamp();
    if v_tender.status not in ('auction_scheduled', 'auction') or v_now < v_tender.ra_starts_at or v_now >= v_tender.ra_ends_at then
      raise exception 'AUCTION_CLOSED' using errcode = 'P0001';
    end if;
    if not private.seller_can_bid(v_seller, v_tender) then
      raise exception 'NOT_ELIGIBLE' using errcode = 'P0001';
    end if;
    select * into v_settings from public.platform_settings where id = v_tender.settings_id;
    v_max_allowed := v_tender.l1_paise - ceil(v_tender.l1_paise * v_settings.decrement_bps / 10000.0)::bigint;
    if p_unit_paise > v_max_allowed then
      raise exception 'BID_TOO_HIGH' using errcode = 'P0001';
    end if;

    insert into public.bids (tender_id, seller_org_id, phase, unit_paise, idempotency_key, placed_at)
    values (p_id, v_seller.id, 'auction', p_unit_paise, p_idempotency_key, v_now)
    returning * into v_bid;
    insert into public.tender_participants (tender_id, seller_org_id, last_bid_paise, last_bid_at)
    values (p_id, v_seller.id, p_unit_paise, v_now)
    on conflict (tender_id, seller_org_id) do update set last_bid_paise = excluded.last_bid_paise, last_bid_at = excluded.last_bid_at;

    v_extend := v_tender.ra_ends_at - v_now <= make_interval(mins => v_settings.snipe_window_minutes)
      and v_tender.snipe_extensions_used < v_settings.snipe_max;
    update public.tenders set
      status = 'auction', l1_paise = p_unit_paise, bid_count = bid_count + 1, seq = seq + 1,
      snipe_extensions_used = snipe_extensions_used + case when v_extend then 1 else 0 end,
      ra_ends_at = ra_ends_at + case when v_extend then make_interval(mins => v_settings.snipe_window_minutes) else interval '0' end,
      bid_ends_at = bid_ends_at + case when v_extend then make_interval(mins => v_settings.snipe_window_minutes) else interval '0' end
    where id = p_id returning * into v_tender;
  end if;

  select count(*) + 1 into v_rank from public.tender_participants
  where tender_id = p_id and last_bid_paise < v_bid.unit_paise;
  return jsonb_build_object('bidId', v_bid.id, 'unitPaise', v_bid.unit_paise, 'rank', v_rank,
    'l1Paise', v_tender.l1_paise, 'endsAt', v_tender.ra_ends_at, 'seq', v_tender.seq);
end;
$$;

-- Buyers get the count and the clock only. Rule 5 forbids any price here.
create function public.buyer_auction(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('status', t.status, 'bidCount', t.bid_count, 'startsAt', t.ra_starts_at,
    'endsAt', t.ra_ends_at, 'seq', t.seq, 'serverNow', clock_timestamp())
  from public.tenders t
  where t.id = p_id and t.type <> 'bid' and t.buyer_org_id = public.current_org_id();
$$;

-- Sellers get L1, their own bid and rank. Identities and other sellers' prices stay out.
create function public.seller_auction(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_org public.organisations;
  v_tender public.tenders;
  v_participant public.tender_participants;
  v_settings public.platform_settings;
  v_eligible boolean;
begin
  select * into v_org from public.organisations where id = public.current_org_id();
  select * into v_tender from public.tenders where id = p_id and type <> 'bid';
  if not found or v_org.id is null then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  select * into v_participant from public.tender_participants where tender_id = p_id and seller_org_id = v_org.id;
  v_eligible := private.seller_can_bid(v_org, v_tender);
  if v_participant.seller_org_id is null and not (v_eligible and v_tender.status in ('auction_scheduled', 'auction')) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  select * into v_settings from public.platform_settings where id = v_tender.settings_id;
  return jsonb_build_object(
    'status', v_tender.status, 'eligible', v_eligible, 'startsAt', v_tender.ra_starts_at, 'endsAt', v_tender.ra_ends_at,
    'serverNow', clock_timestamp(), 'seq', v_tender.seq, 'bidCount', v_tender.bid_count, 'l1Paise', v_tender.l1_paise,
    'maxAllowedPaise', v_tender.l1_paise - ceil(v_tender.l1_paise * v_settings.decrement_bps / 10000.0)::bigint,
    'myBidPaise', v_participant.last_bid_paise,
    'rank', case when v_participant.last_bid_paise is not null then (
      select count(*) + 1 from public.tender_participants
      where tender_id = p_id and last_bid_paise < v_participant.last_bid_paise
    ) end,
    'bidsPaise', (
      select coalesce(jsonb_agg(recent.unit_paise order by recent.placed_at), '[]'::jsonb)
      from (
        select unit_paise, placed_at from public.bids
        where tender_id = p_id and phase = 'auction' order by placed_at desc limit 30
      ) as recent
    )
  );
end;
$$;

create or replace function public.get_buyer_tender(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', t.id, 'tenderNo', t.tender_no, 'title', t.title, 'kind', t.kind, 'type', t.type, 'raStartsAt', t.ra_starts_at, 'status', t.status, 'quantity', t.quantity,
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

-- A seller sees only their own bid. Rivals, their prices and their count are never returned.
create or replace function public.get_seller_tender(p_id uuid) returns jsonb
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
  if v_tender.status not in ('bidding', 'auction_scheduled', 'auction') and v_participant.seller_org_id is null then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  select * into v_award from public.tender_awards where tender_id = p_id and seller_org_id = v_org.id;
  return jsonb_build_object(
    'id', v_tender.id, 'tenderNo', v_tender.tender_no, 'title', v_tender.title, 'type', v_tender.type,
    'open', v_tender.status = 'bidding' and now() < v_tender.bid_ends_at,
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

drop function public.public_tenders(integer, integer);
drop function public.seller_tenders();
create function public.public_tenders(p_limit integer default 20, p_offset integer default 0) returns table (
  id uuid, tender_no text, type public.tender_type, title text, category_name text, quantity numeric, unit text, delivery_state_code text,
  bid_ends_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select t.id, t.tender_no, t.type, t.title, c.name, t.quantity, t.unit, t.delivery_state_code::text, t.bid_ends_at
  from public.tenders t join public.categories c on c.id = t.category_id
  where t.status in ('bidding', 'auction_scheduled', 'auction') and t.bid_ends_at > now()
  order by t.bid_ends_at
  limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0);
$$;

create or replace function public.public_tender(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', t.id, 'tenderNo', t.tender_no, 'type', t.type, 'raStartsAt', t.ra_starts_at, 'title', t.title, 'categoryName', c.name, 'quantity', t.quantity, 'unit', t.unit,
    'deliveryStateCode', t.delivery_state_code, 'bidEndsAt', t.bid_ends_at, 'contractMonths', t.contract_months,
    'paymentTerms', t.payment_terms, 'creditDays', t.credit_days,
    'specs', (
      select coalesce(jsonb_agg(jsonb_build_object('label', s.label, 'value', s.value, 'unit', s.unit) order by s.is_key desc, s.label), '[]'::jsonb)
      from public.tender_specs s where s.tender_id = t.id
    )
  )
  from public.tenders t join public.categories c on c.id = t.category_id
  where t.id = p_id and t.status in ('bidding', 'auction_scheduled', 'auction') and t.bid_ends_at > now();
$$;

create function public.seller_tenders() returns table (
  id uuid, tender_no text, type public.tender_type, title text, category_name text, quantity numeric, unit text, delivery_state_code text,
  bid_ends_at timestamptz, my_bid_paise bigint, award_status public.award_status
)
language sql stable security definer set search_path = '' as $$
  select t.id, t.tender_no, t.type, t.title, c.name, t.quantity, t.unit, t.delivery_state_code::text, t.bid_ends_at,
    p.last_bid_paise, a.status
  from public.tenders t
  join public.categories c on c.id = t.category_id
  join public.organisations o on o.id = public.current_org_id()
  left join public.tender_participants p on p.tender_id = t.id and p.seller_org_id = o.id
  left join public.tender_awards a on a.tender_id = t.id and a.seller_org_id = o.id
  where (t.status in ('bidding', 'auction_scheduled', 'auction') and t.bid_ends_at > now() and private.seller_can_bid(o, t)) or p.seller_org_id is not null
  order by t.bid_ends_at desc limit 50;
$$;

revoke all on function public.create_tender, public.place_ra_bid, public.buyer_auction, public.seller_auction,
  public.public_tenders, public.seller_tenders from public, anon, authenticated;
grant execute on function public.create_tender, public.place_ra_bid, public.buyer_auction, public.seller_auction,
  public.seller_tenders to authenticated;
grant execute on function public.public_tenders to anon, authenticated;
