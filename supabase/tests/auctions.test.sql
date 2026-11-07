begin;
select plan(33);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'buyer@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'one@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'two@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'outsider@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'admin@example.com');
insert into organisations (id, kind, entity_type, legal_name, pan_enc, pan_hmac, gstin, status) values
  ('a0000000-0000-0000-0000-000000000001', 'buyer', 'company', 'Buying Co', 'x', 'a1', '08AABCN1234F1Z5', 'active'),
  ('a0000000-0000-0000-0000-000000000002', 'seller', 'company', 'Seller One', 'x', 'a2', '08AABCN1235F1Z5', 'active'),
  ('a0000000-0000-0000-0000-000000000003', 'seller', 'company', 'Seller Two', 'x', 'a3', '08AABCN1236F1Z5', 'active'),
  ('a0000000-0000-0000-0000-000000000004', 'seller', 'company', 'Outsider', 'x', 'a4', '08AABCN1237F1Z5', 'active');
insert into org_addresses (id, org_id, label, line1, city, state_code, pincode, is_registered) values
  ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Registered office', '1 Road', 'Jaipur', '08', '302001', true),
  ('a1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Registered office', '2 Road', 'Jaipur', '08', '302001', true);
update profiles set org_id = 'a0000000-0000-0000-0000-000000000001' where email = 'buyer@example.com';
update profiles set org_id = 'a0000000-0000-0000-0000-000000000002' where email = 'one@example.com';
update profiles set org_id = 'a0000000-0000-0000-0000-000000000003' where email = 'two@example.com';
update profiles set org_id = 'a0000000-0000-0000-0000-000000000004' where email = 'outsider@example.com';
update profiles set role = 'admin' where email = 'admin@example.com';
insert into products (id, seller_org_id, category_id, title, mrp_paise, discount_bps, unit, stock_qty, status)
select v.id::uuid, v.seller::uuid, c.id, 'Brass valve', 100000, 1000, 'pc', 10, 'published'
from categories c, (values
  ('a2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002'),
  ('a2000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003')
) as v (id, seller) where c.slug = 'hardware';
insert into product_states (product_id, state_code) values
  ('a2000000-0000-0000-0000-000000000001', '08'), ('a2000000-0000-0000-0000-000000000002', '08');

create schema test_helpers;
create function test_helpers.act_as(p_id text, p_aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_id, true);
  select set_config('request.jwt.claims', json_build_object('aal', p_aal)::text, true);
$$;
create function test_helpers.new_auction(p_min integer, p_starts interval, p_ends interval) returns uuid language sql as $$
  select public.create_tender('regular', 'a2000000-0000-0000-0000-000000000001', null, '', '', 100, null, '[]',
    'advance', null, 'Plant Stores', '08AABCN1234F1Z5', 'a1000000-0000-0000-0000-000000000001', 12, null, p_min, 0, 60,
    'ra', now() + p_starts, now() + p_ends);
$$;
create function test_helpers.pay(p_charge uuid, p_order text) returns text language plpgsql security definer as $$
declare
  v_amount bigint;
begin
  select total_paise into v_amount from public.fee_charges where id = p_charge;
  insert into public.payments (org_id, charge_id, provider_order_id, amount_paise)
  select org_id, id, p_order, total_paise from public.fee_charges where id = p_charge;
  return public.apply_payment_event('evt_' || p_order, 'payment.captured', p_order, 'pay_' || p_order, v_amount, null);
end;
$$;
create function test_helpers.open_now(p_id uuid, p_left interval) returns void language sql security definer as $$
  update public.tenders set ra_starts_at = now() - interval '1 minute', ra_ends_at = now() + p_left, bid_ends_at = now() + p_left where id = p_id;
$$;
create function test_helpers.tender(p_id uuid) returns public.tenders language sql security definer as $$
  select * from public.tenders where id = p_id;
$$;
grant usage on schema test_helpers to authenticated;
grant execute on all functions in schema test_helpers to authenticated;

-- Creating and scheduling
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$select test_helpers.new_auction(1, interval '10 minutes', interval '2 hours')$$, 'P0001', 'VALIDATION_FAILED', 'an auction needs an hour of notice');
select throws_ok($$select test_helpers.new_auction(1, interval '2 hours', interval '2 hours 5 minutes')$$, 'P0001', 'VALIDATION_FAILED', 'an auction runs at least 15 minutes');
select set_config('test.t', test_helpers.new_auction(1, interval '2 hours', interval '3 hours')::text, true);
select matches((test_helpers.tender(current_setting('test.t')::uuid)).tender_no, '^BM/\d{2}/RA/\d{5}$', 'an auction has an RA number');
select set_config('test.c', publish_tender(current_setting('test.t')::uuid)::text, true);
reset role;
select is(test_helpers.pay(current_setting('test.c')::uuid, 'oa1'), 'paid', 'the fee is received');
select is((test_helpers.tender(current_setting('test.t')::uuid)).status::text, 'auction_scheduled', 'payment schedules the auction');

-- Before the start
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000a2');
select throws_ok(format($$select place_ra_bid(%L, 90000, 'k0')$$, current_setting('test.t')), 'P0001', 'AUCTION_CLOSED', 'a bid before the start is refused');
reset role;
select test_helpers.open_now(current_setting('test.t')::uuid, interval '1 hour');

-- Bidding
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000a4');
select throws_ok(format($$select place_ra_bid(%L, 90000, 'k1')$$, current_setting('test.t')), 'P0001', 'NOT_ELIGIBLE', 'an ineligible seller cannot bid');
select throws_ok(format($$select seller_auction(%L)$$, current_setting('test.t')), 'P0001', 'NOT_FOUND', 'an ineligible seller cannot watch the auction');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000a2');
select is((place_ra_bid(current_setting('test.t')::uuid, 90000, 'k2') ->> 'rank')::integer, 1, 'the first bid becomes L1');
select is((place_ra_bid(current_setting('test.t')::uuid, 90000, 'k2') ->> 'seq')::integer, 1, 'a retry with the same key returns the first result');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000a3');
select is((seller_auction(current_setting('test.t')::uuid) ->> 'maxAllowedPaise')::bigint, 89550::bigint, 'the next bid must be 0.5% lower');
select throws_ok(format($$select place_ra_bid(%L, 89551, 'k3')$$, current_setting('test.t')), 'P0001', 'BID_TOO_HIGH', 'a bid above the decrement is refused');
select is((place_ra_bid(current_setting('test.t')::uuid, 89550, 'k4') ->> 'rank')::integer, 1, 'a bid at the limit becomes L1');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000a2');
select is((seller_auction(current_setting('test.t')::uuid) ->> 'rank')::integer, 2, 'the outbid seller is L2');
select is((seller_auction(current_setting('test.t')::uuid) ->> 'l1Paise')::bigint, 89550::bigint, 'sellers see L1');
select ok(not (seller_auction(current_setting('test.t')::uuid)::text ~ 'Seller Two|a0000000-0000-0000-0000-000000000003'), 'sellers never see a rival identity');

-- Buyer masking
select test_helpers.act_as('00000000-0000-0000-0000-0000000000a1');
select is((buyer_auction(current_setting('test.t')::uuid) ->> 'bidCount')::integer, 2, 'the buyer sees the bid count');
select ok(not (buyer_auction(current_setting('test.t')::uuid)::text ~ '89550|90000'), 'the buyer sees no price while live');
select ok(not (get_buyer_tender(current_setting('test.t')::uuid)::text ~ '89550'), 'the tender page shows no live price');
select throws_ok(format($$select * from tender_bids(%L)$$, current_setting('test.t')), 'P0001', 'FORBIDDEN', 'the buyer cannot list bids while live');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000a2');
select is(buyer_auction(current_setting('test.t')::uuid), null, 'a seller cannot use the buyer view');
reset role;

-- Anti-sniping
select test_helpers.open_now(current_setting('test.t')::uuid, interval '2 minutes');
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000a2');
select lives_ok(format($$select place_ra_bid(%L, 89000, 'k5')$$, current_setting('test.t')), 'a seller bids in the last minutes');
select ok((test_helpers.tender(current_setting('test.t')::uuid)).ra_ends_at > now() + interval '6 minutes', 'the bid adds 5 minutes');
select is((test_helpers.tender(current_setting('test.t')::uuid)).snipe_extensions_used, 1, 'the extension is counted');
reset role;
update tenders set snipe_extensions_used = 6 where id = current_setting('test.t')::uuid;
select test_helpers.open_now(current_setting('test.t')::uuid, interval '2 minutes');
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000a3');
select lives_ok(format($$select place_ra_bid(%L, 88000, 'k6')$$, current_setting('test.t')), 'bidding continues after the last extension');
select ok((test_helpers.tender(current_setting('test.t')::uuid)).ra_ends_at < now() + interval '3 minutes', 'six extensions are the limit');
reset role;

-- Pause and resume
select test_helpers.open_now(current_setting('test.t')::uuid, interval '10 minutes');
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000a5', 'aal2');
select lives_ok(format($$select admin_pause_auction(%L, 'Payment provider outage')$$, current_setting('test.t')), 'support pauses a live auction');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000a2');
select throws_ok(format($$select place_ra_bid(%L, 80000, 'kp')$$, current_setting('test.t')), 'P0001', 'AUCTION_PAUSED', 'a paused auction refuses bids');
select is((seller_auction(current_setting('test.t')::uuid) ->> 'paused')::boolean, true, 'sellers see the pause');
reset role;
update tenders set paused_at = now() - interval '20 minutes', ra_starts_at = now() - interval '30 minutes' where id = current_setting('test.t')::uuid;
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000a5', 'aal2');
select lives_ok(format($$select admin_resume_auction(%L, 'Provider back')$$, current_setting('test.t')), 'support resumes the auction');
select ok((test_helpers.tender(current_setting('test.t')::uuid)).ra_ends_at > now() + interval '9 minutes', 'resuming gives back the time lost');
reset role;

-- Closing
update tenders set ra_ends_at = now() - interval '1 second', bid_ends_at = now() - interval '1 second' where id = current_setting('test.t')::uuid;
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000a2');
select throws_ok(format($$select place_ra_bid(%L, 1000, 'k7')$$, current_setting('test.t')), 'P0001', 'AUCTION_CLOSED', 'a late bid fails even before the job runs');
reset role;
select tick_tenders();
select is((test_helpers.tender(current_setting('test.t')::uuid)).status::text, 'evaluating', 'the job closes the auction');

select * from finish();
rollback;
