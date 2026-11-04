begin;
select plan(38);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'buyer@example.com'),
  ('00000000-0000-0000-0000-0000000000f2', 'one@example.com'),
  ('00000000-0000-0000-0000-0000000000f3', 'two@example.com'),
  ('00000000-0000-0000-0000-0000000000f4', 'outsider@example.com');
insert into organisations (id, kind, entity_type, legal_name, pan_enc, pan_hmac, gstin, status) values
  ('f0000000-0000-0000-0000-000000000001', 'buyer', 'company', 'Buying Co', 'x', 'f1', '08AABCN1234F1Z5', 'active'),
  ('f0000000-0000-0000-0000-000000000002', 'seller', 'company', 'Seller One', 'x', 'f2', '08AABCN1235F1Z5', 'active'),
  ('f0000000-0000-0000-0000-000000000003', 'seller', 'company', 'Seller Two', 'x', 'f3', '08AABCN1236F1Z5', 'active'),
  ('f0000000-0000-0000-0000-000000000004', 'seller', 'company', 'Outsider', 'x', 'f4', '08AABCN1237F1Z5', 'active');
insert into org_addresses (id, org_id, label, line1, city, state_code, pincode, is_registered) values
  ('f1000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'Registered office', '1 Road', 'Jaipur', '08', '302001', true),
  ('f1000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002', 'Registered office', '2 Road', 'Jaipur', '08', '302001', true),
  ('f1000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000003', 'Registered office', '3 Road', 'Jaipur', '08', '302001', true);
update profiles set org_id = 'f0000000-0000-0000-0000-000000000001' where email = 'buyer@example.com';
update profiles set org_id = 'f0000000-0000-0000-0000-000000000002' where email = 'one@example.com';
update profiles set org_id = 'f0000000-0000-0000-0000-000000000003' where email = 'two@example.com';
update profiles set org_id = 'f0000000-0000-0000-0000-000000000004' where email = 'outsider@example.com';
insert into products (id, seller_org_id, category_id, title, mrp_paise, discount_bps, unit, stock_qty, status)
select v.id::uuid, v.seller::uuid, c.id, 'Brass valve', 100000, 1000, 'pc', 10, 'published'
from categories c, (values
  ('f2000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002'),
  ('f2000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000003')
) as v (id, seller) where c.slug = 'hardware';
insert into product_states (product_id, state_code) values
  ('f2000000-0000-0000-0000-000000000001', '08'), ('f2000000-0000-0000-0000-000000000002', '08');

create schema test_helpers;
create function test_helpers.act_as(p_id text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_id, true);
  select set_config('request.jwt.claims', json_build_object('aal', 'aal1')::text, true);
$$;
create function test_helpers.new_tender(p_kind text, p_min integer, p_extensions integer default 0) returns uuid language sql as $$
  select public.create_tender(p_kind::public.tender_kind,
    case when p_kind = 'regular' then 'f2000000-0000-0000-0000-000000000001'::uuid end,
    (select id from public.categories where slug = 'hardware'), 'Custom valves', 'pc', 100, 100000,
    '[{"label": "Size", "value": "2 inch"}]', 'advance', null, 'Plant Stores', '08AABCN1234F1Z5',
    'f1000000-0000-0000-0000-000000000001', 12, now() + interval '2 days', p_min, p_extensions, 60);
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
create function test_helpers.close_bidding(p_id uuid) returns integer language plpgsql security definer as $$
begin
  update public.tenders set bid_ends_at = now() - interval '1 minute' where id = p_id;
  return public.tick_tenders();
end;
$$;
create function test_helpers.status(p_id uuid) returns text language sql security definer as $$
  select status::text from public.tenders where id = p_id;
$$;
grant usage on schema test_helpers to authenticated;
grant execute on all functions in schema test_helpers to authenticated;

-- Creating and publishing
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000f2');
select throws_ok($$select test_helpers.new_tender('regular', 1)$$, 'P0001', 'FORBIDDEN', 'sellers cannot create tenders');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000f1');
select set_config('test.t1', test_helpers.new_tender('regular', 2)::text, true);
select is(test_helpers.status(current_setting('test.t1')::uuid), 'draft', 'a tender starts as a draft');
select is((select count(*) from public_tenders()), 0::bigint, 'a draft is not public');
select set_config('test.c1', publish_tender(current_setting('test.t1')::uuid)::text, true);
select is(publish_tender(current_setting('test.t1')::uuid)::text, current_setting('test.c1'), 'publishing twice reuses the charge');
reset role;
select is((select fee_paise from fee_charges where id = current_setting('test.c1')::uuid), 45000::bigint, 'the buyer fee is 0.5% of the server estimate');
select is(test_helpers.pay(current_setting('test.c1')::uuid, 'ot1'), 'paid', 'the fee is received');
select is(test_helpers.status(current_setting('test.t1')::uuid), 'bidding', 'payment opens bidding');
select is((select status::text from fee_charges where id = current_setting('test.c1')::uuid), 'held', 'the tender fee is held');

-- Access
set local role anon;
select is((select count(*) from public_tenders()), 1::bigint, 'visitors see the open tender');
select is(public_tender(current_setting('test.t1')::uuid) ->> 'consigneeName', null, 'visitors never see the consignee');
select throws_ok($$select * from bids$$, '42501', null, 'visitors cannot read bids');
reset role;

-- Bids
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000f4');
select throws_ok(format($$select submit_bid(%L, 90000)$$, current_setting('test.t1')), 'P0001', 'NOT_ELIGIBLE', 'a seller with no product in the category cannot bid');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000f2');
select lives_ok(format($$select submit_bid(%L, 90000)$$, current_setting('test.t1')), 'an eligible seller bids');
select lives_ok(format($$select withdraw_bid(%L)$$, current_setting('test.t1')), 'a seller withdraws');
select lives_ok(format($$select submit_bid(%L, 85000)$$, current_setting('test.t1')), 'a seller bids again');
select lives_ok(format($$select submit_bid(%L, 80000)$$, current_setting('test.t1')), 'a third attempt is allowed');
select throws_ok(format($$select submit_bid(%L, 70000)$$, current_setting('test.t1')), 'P0001', 'LIMIT_EXCEEDED', 'a fourth attempt is refused');
select is((get_seller_tender(current_setting('test.t1')::uuid) ->> 'myBidPaise')::bigint, 80000::bigint, 'a seller sees their own bid');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000f3');
select is(get_seller_tender(current_setting('test.t1')::uuid) ->> 'myBidPaise', null, 'a rival cannot see that bid');
select lives_ok(format($$select submit_bid(%L, 82000)$$, current_setting('test.t1')), 'a second seller bids');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000f1');
select throws_ok(format($$select * from tender_bids(%L)$$, current_setting('test.t1')), 'P0001', 'FORBIDDEN', 'the buyer cannot see sealed bids before close');
reset role;
select throws_ok($$update bids set unit_paise = 1$$, 'P0001', 'Bids are append-only', 'a bid cannot be changed');

-- Closing and award chain
select test_helpers.close_bidding(current_setting('test.t1')::uuid);
select is(test_helpers.status(current_setting('test.t1')::uuid), 'evaluating', 'enough bids move the tender to evaluation');
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000f2');
select throws_ok(format($$select submit_bid(%L, 1000)$$, current_setting('test.t1')), 'P0001', 'TENDER_CLOSED', 'a late bid is refused');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000f1');
select is((select unit_paise from tender_bids(current_setting('test.t1')::uuid) where rank = 1), 80000::bigint, 'the buyer sees L1 after close');
select is((select count(*) from tender_bids(current_setting('test.t1')::uuid)), 2::bigint, 'only active bids are listed');
select lives_ok(format($$select award_tender(%L, 1)$$, current_setting('test.t1')), 'the buyer awards L1');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000f2');
select lives_ok(format($$select reject_award(%L, 'Cannot supply')$$, current_setting('test.t1')), 'L1 rejects the award');
reset role;
select is((select strike_count from organisations where id = 'f0000000-0000-0000-0000-000000000002'), 1, 'rejection adds a strike');
select ok((select blocked_until > now() + interval '29 days' from organisations where id = 'f0000000-0000-0000-0000-000000000002'), 'the first strike blocks for 30 days');
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000f3');
select is(get_seller_tender(current_setting('test.t1')::uuid) -> 'award' ->> 'status', 'offered', 'the award passes to the next seller');
select set_config('test.c2', accept_award(current_setting('test.t1')::uuid)::text, true);
reset role;
select is((select fee_paise from fee_charges where id = current_setting('test.c2')::uuid), 41000::bigint, 'the seller fee is 0.5% of the awarded value');
select is(test_helpers.pay(current_setting('test.c2')::uuid, 'ot2'), 'paid', 'the seller fee is received');
select is(test_helpers.status(current_setting('test.t1')::uuid), 'ordered', 'payment creates the order');
select is((select count(*) from orders where tender_id = current_setting('test.t1')::uuid and status = 'accepted' and total_paise = 8200000), 1::bigint, 'the order uses the awarded price');

-- Too few bids
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000f1');
select set_config('test.t2', test_helpers.new_tender('regular', 3)::text, true);
select set_config('test.c3', publish_tender(current_setting('test.t2')::uuid)::text, true);
reset role;
select test_helpers.pay(current_setting('test.c3')::uuid, 'ot3');
select test_helpers.close_bidding(current_setting('test.t2')::uuid);
select is(test_helpers.status(current_setting('test.t2')::uuid), 'cancelled', 'too few bids with no extensions cancels the tender');
select is((select status::text from fee_charges where id = current_setting('test.c3')::uuid), 'released', 'the fee returns to the wallet');

-- Custom deposit
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000f1');
select set_config('test.t3', test_helpers.new_tender('custom', 1)::text, true);
select set_config('test.c4', publish_tender(current_setting('test.t3')::uuid)::text, true);
reset role;
select is((select fee_paise from fee_charges where id = current_setting('test.c4')::uuid), 100000::bigint, 'a custom tender pays the fixed deposit');

select * from finish();
rollback;
