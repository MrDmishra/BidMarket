begin;
select plan(37);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'buyer@example.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'one@example.com'),
  ('00000000-0000-0000-0000-0000000000b3', 'two@example.com'),
  ('00000000-0000-0000-0000-0000000000b4', 'outsider@example.com'),
  ('00000000-0000-0000-0000-0000000000b5', 'three@example.com'),
  ('00000000-0000-0000-0000-0000000000b6', 'four@example.com');
insert into organisations (id, kind, entity_type, legal_name, pan_enc, pan_hmac, gstin, status) values
  ('b0000000-0000-0000-0000-000000000001', 'buyer', 'company', 'Buying Co', 'x', 'b1', '08AABCN1234F1Z5', 'active'),
  ('b0000000-0000-0000-0000-000000000002', 'seller', 'company', 'Seller One', 'x', 'b2', '08AABCN1235F1Z5', 'active'),
  ('b0000000-0000-0000-0000-000000000003', 'seller', 'company', 'Seller Two', 'x', 'b3', '08AABCN1236F1Z5', 'active'),
  ('b0000000-0000-0000-0000-000000000004', 'seller', 'company', 'Outsider', 'x', 'b4', '08AABCN1237F1Z5', 'active'),
  ('b0000000-0000-0000-0000-000000000005', 'seller', 'company', 'Seller Three', 'x', 'b5', '08AABCN1238F1Z5', 'active'),
  ('b0000000-0000-0000-0000-000000000006', 'seller', 'company', 'Seller Four', 'x', 'b6', '08AABCN1239F1Z5', 'active');
insert into org_addresses (id, org_id, label, line1, city, state_code, pincode, is_registered) values
  ('b1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Registered office', '1 Road', 'Jaipur', '08', '302001', true),
  ('b1000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'Registered office', '3 Road', 'Jaipur', '08', '302001', true);
update profiles set org_id = 'b0000000-0000-0000-0000-000000000001' where email = 'buyer@example.com';
update profiles set org_id = 'b0000000-0000-0000-0000-000000000002' where email = 'one@example.com';
update profiles set org_id = 'b0000000-0000-0000-0000-000000000003' where email = 'two@example.com';
update profiles set org_id = 'b0000000-0000-0000-0000-000000000004' where email = 'outsider@example.com';
update profiles set org_id = 'b0000000-0000-0000-0000-000000000005' where email = 'three@example.com';
update profiles set org_id = 'b0000000-0000-0000-0000-000000000006' where email = 'four@example.com';
insert into products (id, seller_org_id, category_id, title, mrp_paise, discount_bps, unit, stock_qty, status)
select v.id::uuid, v.seller::uuid, c.id, 'Brass valve', 100000, 1000, 'pc', 10, 'published'
from categories c, (values
  ('b2000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002'),
  ('b2000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003'),
  ('b2000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000005'),
  ('b2000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000006')
) as v (id, seller) where c.slug = 'hardware';
insert into product_states (product_id, state_code)
select id, '08' from products where id::text like 'b2000000%';

create schema test_helpers;
create function test_helpers.act_as(p_id text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_id, true);
  select set_config('request.jwt.claims', json_build_object('aal', 'aal1')::text, true);
$$;
create function test_helpers.new_tender(p_min integer, p_ra_gap interval) returns uuid language sql as $$
  select public.create_tender('regular', 'b2000000-0000-0000-0000-000000000002', null, '', '', 100, null, '[]',
    'advance', null, 'Plant Stores', '08AABCN1234F1Z5', 'b1000000-0000-0000-0000-000000000001', 12,
    now() + interval '2 days', p_min, 1, 60, 'bid_to_ra', now() + interval '2 days' + p_ra_gap,
    now() + interval '2 days' + p_ra_gap + interval '1 hour');
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
create function test_helpers.publish_and_pay(p_id uuid, p_order text) returns text language plpgsql as $$
declare
  v_charge uuid;
begin
  perform test_helpers.act_as('00000000-0000-0000-0000-0000000000b1');
  v_charge := public.publish_tender(p_id);
  return test_helpers.pay(v_charge, p_order);
end;
$$;
create function test_helpers.bid(p_user text, p_id uuid, p_paise bigint) returns uuid language sql as $$
  select test_helpers.act_as(p_user);
  select public.submit_bid(p_id, p_paise);
$$;
create function test_helpers.close_sealed(p_id uuid) returns integer language sql security definer as $$
  update public.tenders set bid_ends_at = now() - interval '1 minute' where id = p_id;
  select public.tick_tenders();
$$;
create function test_helpers.open_now(p_id uuid) returns void language sql security definer as $$
  update public.tenders set ra_starts_at = now() - interval '1 minute', ra_ends_at = now() + interval '1 hour',
    bid_ends_at = now() + interval '1 hour' where id = p_id;
$$;
create function test_helpers.close_auction(p_id uuid) returns integer language sql security definer as $$
  update public.tenders set ra_ends_at = now() - interval '1 second', bid_ends_at = now() - interval '1 second' where id = p_id;
  select public.tick_tenders();
$$;
create function test_helpers.tender(p_id uuid) returns public.tenders language sql security definer as $$
  select * from public.tenders where id = p_id;
$$;
grant usage on schema test_helpers to authenticated;
grant execute on all functions in schema test_helpers to authenticated;

-- Creating
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000b1');
select throws_ok($$select test_helpers.new_tender(1, interval '30 minutes')$$, 'P0001', 'VALIDATION_FAILED',
  'the auction starts at least an hour after sealed bidding');
select set_config('test.t1', test_helpers.new_tender(3, interval '2 hours')::text, true);
select matches((test_helpers.tender(current_setting('test.t1')::uuid)).tender_no, '^BM/\d{2}/BRA/\d{5}$', 'a Bid to RA tender has a BRA number');
reset role;
select is(test_helpers.publish_and_pay(current_setting('test.t1')::uuid, 'obr1'), 'paid', 'the fee is received');
select is((test_helpers.tender(current_setting('test.t1')::uuid)).status::text, 'bidding', 'payment opens sealed bidding');

-- Sealed round: four sellers bid
set local role authenticated;
select test_helpers.bid('00000000-0000-0000-0000-0000000000b2', current_setting('test.t1')::uuid, 99100);
select test_helpers.bid('00000000-0000-0000-0000-0000000000b6', current_setting('test.t1')::uuid, 98100);
select test_helpers.bid('00000000-0000-0000-0000-0000000000b3', current_setting('test.t1')::uuid, 95100);
select test_helpers.bid('00000000-0000-0000-0000-0000000000b5', current_setting('test.t1')::uuid, 91100);
select test_helpers.act_as('00000000-0000-0000-0000-0000000000b1');
select throws_ok(format($$select shortlist_tender(%L, 'highest50')$$, current_setting('test.t1')), 'P0001', 'INVALID_STATE',
  'the buyer cannot shortlist while bidding is open');
reset role;
select test_helpers.close_sealed(current_setting('test.t1')::uuid);
select is((test_helpers.tender(current_setting('test.t1')::uuid)).status::text, 'shortlisting', 'closing the sealed round starts shortlisting');

-- Shortlisting
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000b1');
select is((get_buyer_tender(current_setting('test.t1')::uuid) ->> 'sealedBidCount')::integer, 4, 'the buyer sees how many sealed bids arrived');
select ok(not (get_buyer_tender(current_setting('test.t1')::uuid)::text ~ '91100|95100|98100|99100'), 'the buyer sees no sealed price');
select throws_ok(format($$select * from tender_bids(%L)$$, current_setting('test.t1')), 'P0001', 'FORBIDDEN',
  'the buyer cannot list sealed bids before the auction');
select throws_ok(format($$select shortlist_tender(%L, 'lowest')$$, current_setting('test.t1')), 'P0001', 'VALIDATION_FAILED',
  'an unknown shortlist choice is refused');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000b3');
select throws_ok(format($$select shortlist_tender(%L, 'highest50')$$, current_setting('test.t1')), 'P0001', 'NOT_FOUND',
  'a seller cannot shortlist');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000b1');
select is(shortlist_tender(current_setting('test.t1')::uuid, 'highest50'), 2, 'removing the highest half keeps two sellers');
select throws_ok(format($$select shortlist_tender(%L, 'highest')$$, current_setting('test.t1')), 'P0001', 'INVALID_STATE',
  'a tender is shortlisted once');
reset role;
select is((test_helpers.tender(current_setting('test.t1')::uuid)).status::text, 'auction_scheduled', 'shortlisting schedules the auction');
select is((test_helpers.tender(current_setting('test.t1')::uuid)).l1_paise, 91100::bigint, 'the auction opens at the lowest sealed bid still in');

-- Auction among the sellers still in
select test_helpers.open_now(current_setting('test.t1')::uuid);
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000b2');
select is((get_seller_tender(current_setting('test.t1')::uuid) ->> 'eliminated')::boolean, true, 'a removed seller is told');
select throws_ok(format($$select place_ra_bid(%L, 80000, 'b1')$$, current_setting('test.t1')), 'P0001', 'NOT_ELIGIBLE',
  'a removed seller cannot bid in the auction');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000b6');
select is((seller_auction(current_setting('test.t1')::uuid) ->> 'eligible')::boolean, false, 'a removed seller sees the auction as closed to them');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000b4');
select throws_ok(format($$select get_seller_tender(%L)$$, current_setting('test.t1')), 'P0001', 'NOT_FOUND',
  'a seller who did not bid cannot see the auction');
select throws_ok(format($$select place_ra_bid(%L, 80000, 'b2')$$, current_setting('test.t1')), 'P0001', 'NOT_ELIGIBLE',
  'a seller who did not bid cannot join the auction');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000b3');
select is((seller_auction(current_setting('test.t1')::uuid) ->> 'maxAllowedPaise')::bigint, 90644::bigint, 'the first auction bid must beat the sealed L1');
select is((place_ra_bid(current_setting('test.t1')::uuid, 90644, 'b3') ->> 'rank')::integer, 1, 'a seller still in takes L1');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000b5');
select is((seller_auction(current_setting('test.t1')::uuid) ->> 'rank')::integer, 2, 'removed sellers do not count in the ranking');
select is(public_tender(current_setting('test.t1')::uuid), null, 'the auction is not listed to the public');
reset role;

-- Closing and awarding
select test_helpers.close_auction(current_setting('test.t1')::uuid);
select is((test_helpers.tender(current_setting('test.t1')::uuid)).status::text, 'evaluating',
  'the auction closes even with fewer sellers than the sealed minimum');
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000b1');
select is((select count(*) from tender_bids(current_setting('test.t1')::uuid)), 2::bigint, 'removed sellers are left out of the results');
select is((select unit_paise from tender_bids(current_setting('test.t1')::uuid) where rank = 1), 90644::bigint, 'L1 is the auction price');
select lives_ok(format($$select award_tender(%L, 1)$$, current_setting('test.t1')), 'the buyer awards L1');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000b3');
select set_config('test.c1', accept_award(current_setting('test.t1')::uuid)::text, true);
reset role;
select is(test_helpers.pay(current_setting('test.c1')::uuid, 'obr2'), 'paid', 'the winning seller pays the fee');
select is((select count(*) from orders where tender_id = current_setting('test.t1')::uuid and unit_paise = 90644), 1::bigint,
  'a Bid to RA tender ends in an order at the auction price');

-- Removing the highest bidder: every seller tied at the top goes, and removed sellers never get the award
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000b1');
select set_config('test.t2', test_helpers.new_tender(1, interval '2 hours')::text, true);
reset role;
select test_helpers.publish_and_pay(current_setting('test.t2')::uuid, 'obr3');
set local role authenticated;
select test_helpers.bid('00000000-0000-0000-0000-0000000000b2', current_setting('test.t2')::uuid, 100000);
select test_helpers.bid('00000000-0000-0000-0000-0000000000b6', current_setting('test.t2')::uuid, 100000);
select test_helpers.bid('00000000-0000-0000-0000-0000000000b3', current_setting('test.t2')::uuid, 95000);
reset role;
select test_helpers.close_sealed(current_setting('test.t2')::uuid);
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000b1');
select is(shortlist_tender(current_setting('test.t2')::uuid, 'highest'), 1, 'sellers tied at the highest bid all leave');
reset role;
select test_helpers.open_now(current_setting('test.t2')::uuid);
select test_helpers.close_auction(current_setting('test.t2')::uuid);
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000b1');
select award_tender(current_setting('test.t2')::uuid, 1);
select test_helpers.act_as('00000000-0000-0000-0000-0000000000b3');
select reject_award(current_setting('test.t2')::uuid, 'Cannot supply');
reset role;
select is((test_helpers.tender(current_setting('test.t2')::uuid)).status::text, 'cancelled', 'removed sellers are never offered the award');

-- Extensions and a missed shortlist
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000b1');
select set_config('test.t3', test_helpers.new_tender(2, interval '2 hours')::text, true);
reset role;
select test_helpers.publish_and_pay(current_setting('test.t3')::uuid, 'obr4');
update tenders set ra_starts_at = now() + interval '10 minutes', ra_ends_at = now() + interval '40 minutes'
where id = current_setting('test.t3')::uuid;
set local role authenticated;
select test_helpers.bid('00000000-0000-0000-0000-0000000000b2', current_setting('test.t3')::uuid, 100000);
reset role;
select test_helpers.close_sealed(current_setting('test.t3')::uuid);
select ok((test_helpers.tender(current_setting('test.t3')::uuid)).ra_starts_at >= (test_helpers.tender(current_setting('test.t3')::uuid)).bid_ends_at + interval '1 hour',
  'an extension moves the auction after the new deadline');
select is((select ra_ends_at - ra_starts_at from tenders where id = current_setting('test.t3')::uuid), interval '30 minutes',
  'the moved auction keeps its length');
set local role authenticated;
-- b3 is blocked after rejecting the last award, so b5 bids here.
select test_helpers.bid('00000000-0000-0000-0000-0000000000b5', current_setting('test.t3')::uuid, 100000);
reset role;
select test_helpers.close_sealed(current_setting('test.t3')::uuid);
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000b1');
select throws_ok(format($$select shortlist_tender(%L, 'highest')$$, current_setting('test.t3')), 'P0001', 'INVALID_STATE',
  'a shortlist that would remove every seller is refused');
reset role;
update tenders set ra_starts_at = now() - interval '1 minute' where id = current_setting('test.t3')::uuid;
select tick_tenders();
select is((test_helpers.tender(current_setting('test.t3')::uuid)).status::text, 'auction', 'a missed shortlist starts the auction on time');
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000b2');
select is((seller_auction(current_setting('test.t3')::uuid) ->> 'eligible')::boolean, true, 'a missed shortlist keeps every sealed bidder in');
reset role;

select * from finish();
rollback;
