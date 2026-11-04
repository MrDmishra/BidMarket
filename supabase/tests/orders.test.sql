begin;
select plan(36);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'buyer@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'seller@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'rival@example.com');
insert into organisations (id, kind, entity_type, legal_name, pan_enc, pan_hmac, gstin, status) values
  ('e0000000-0000-0000-0000-000000000001', 'buyer', 'company', 'Buying Co', 'x', 'e1', '08AABCN1234F1Z5', 'active'),
  ('e0000000-0000-0000-0000-000000000002', 'seller', 'company', 'Hidden Seller', 'x', 'e2', '23AABCN1235F1Z5', 'active'),
  ('e0000000-0000-0000-0000-000000000003', 'seller', 'company', 'Rival', 'x', 'e3', '23AABCN1236F1Z5', 'active');
insert into org_addresses (id, org_id, label, line1, city, state_code, pincode, is_registered) values
  ('e1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Registered office', '1 Secret Road', 'Jaipur', '08', '302001', true),
  ('e1000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'Registered office', '2 Road', 'Indore', '23', '452001', true);
update profiles set org_id = 'e0000000-0000-0000-0000-000000000001' where email = 'buyer@example.com';
update profiles set org_id = 'e0000000-0000-0000-0000-000000000002', phone = '9000000000' where email = 'seller@example.com';
update profiles set org_id = 'e0000000-0000-0000-0000-000000000003' where email = 'rival@example.com';
insert into products (id, seller_org_id, category_id, title, mrp_paise, discount_bps, unit, stock_qty, status)
select 'e2000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', c.id, 'Brass valve', 100000, 1000, 'pc', 10, 'published'
from categories c where c.slug = 'hardware';
insert into product_states (product_id, state_code) values ('e2000000-0000-0000-0000-000000000001', '08');

create schema test_helpers;
create function test_helpers.act_as(p_id text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_id, true);
  select set_config('request.jwt.claims', json_build_object('aal', 'aal1')::text, true);
$$;
create function test_helpers.place(p_quantity numeric, p_days integer default 7) returns jsonb language sql as $$
  select public.create_order('e2000000-0000-0000-0000-000000000001', p_quantity,
    ((now() at time zone 'Asia/Kolkata')::date + p_days), 'Plant Stores', null,
    'e1000000-0000-0000-0000-000000000001', 'advance', null);
$$;
create function test_helpers.pay(p_charge uuid, p_order text) returns text language plpgsql security definer as $$
declare
  v_payment uuid;
  v_amount bigint;
begin
  select total_paise into v_amount from public.fee_charges where id = p_charge;
  insert into public.payments (org_id, charge_id, provider_order_id, amount_paise)
  select org_id, id, p_order, total_paise from public.fee_charges where id = p_charge returning id into v_payment;
  return public.apply_payment_event('evt_' || p_order, 'payment.captured', p_order, 'pay_' || p_order, v_amount, null);
end;
$$;
create function test_helpers.bucket(p_org uuid, p_bucket public.wallet_bucket) returns bigint language sql security definer as $$
  select coalesce(sum(amount_paise) filter (where to_bucket = p_bucket), 0)
       - coalesce(sum(amount_paise) filter (where from_bucket = p_bucket), 0)
  from public.wallet_entries where org_id = p_org;
$$;
grant usage on schema test_helpers to authenticated;
grant execute on all functions in schema test_helpers to authenticated;

-- Placing an order
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000e1');
select is((quote_order('e2000000-0000-0000-0000-000000000001', 2) ->> 'valuePaise')::bigint, 180000::bigint, 'the quote uses the server price');
select is((quote_order('e2000000-0000-0000-0000-000000000001', 2) ->> 'feePaise')::bigint, 180::bigint, 'the fee is 0.1%');
select throws_ok($$select test_helpers.place(1, 4)$$, 'P0001', 'VALIDATION_FAILED', 'delivery must be at least 5 days away');
select throws_ok($$select test_helpers.place(11)$$, 'P0001', 'LIMIT_EXCEEDED', 'an order cannot exceed stock');
reset role;
update products set stock_qty = 1000 where id = 'e2000000-0000-0000-0000-000000000001';
set local role authenticated;
select throws_ok($$select test_helpers.place(56)$$, 'P0001', 'LIMIT_EXCEEDED', 'an order must stay below the limit');
reset role;
update products set stock_qty = 10 where id = 'e2000000-0000-0000-0000-000000000001';
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000e2');
select throws_ok($$select test_helpers.place(1)$$, 'P0001', 'FORBIDDEN', 'sellers cannot place orders');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000e1');
select set_config('test.order', test_helpers.place(2)::text, true);
select set_config('test.order_id', current_setting('test.order')::jsonb ->> 'orderId', true);
select set_config('test.buyer_charge', current_setting('test.order')::jsonb ->> 'chargeId', true);
reset role;
select is((select stock_qty from products where id = 'e2000000-0000-0000-0000-000000000001'), 8.000, 'placing an order takes stock');
select matches((select order_no from orders where id = current_setting('test.order_id')::uuid), '^BMO-\d{2}-000001$', 'the order number has the expected form');

-- Access before payment
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000e3');
select throws_ok($$select get_order(current_setting('test.order_id')::uuid)$$, 'P0001', 'NOT_FOUND', 'a rival cannot read the order');
select throws_ok($$select * from orders$$, '42501', null, 'the orders table cannot be read directly');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000e2');
select throws_ok($$select accept_order(current_setting('test.order_id')::uuid)$$, 'P0001', 'INVALID_STATE', 'an unpaid order cannot be accepted');
reset role;

-- Buyer fee
select is(test_helpers.pay(current_setting('test.buyer_charge')::uuid, 'order_b1'), 'paid', 'the buyer fee is received');
select is((select status::text from orders where id = current_setting('test.order_id')::uuid), 'awaiting_seller', 'the order waits for the seller');
select is((select status::text from fee_charges where id = current_setting('test.buyer_charge')::uuid), 'held', 'the fee is held');
select is(test_helpers.bucket('e0000000-0000-0000-0000-000000000001', 'on_hold'), 212::bigint, 'the wallet shows the fee on hold');

-- Masking
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000e2');
select is(get_order(current_setting('test.order_id')::uuid) ->> 'deliveryAddress', null, 'the seller cannot see the address before unlock');
select is(get_order(current_setting('test.order_id')::uuid) ->> 'consigneeName', null, 'the seller cannot see the consignee before unlock');
select is(get_order(current_setting('test.order_id')::uuid) ->> 'deliveryCity', 'Jaipur', 'the seller sees the delivery city');
select throws_ok($$select get_order_contacts(current_setting('test.order_id')::uuid)$$, 'P0001', 'FORBIDDEN', 'contacts stay locked');

-- Seller fee
select set_config('test.seller_charge', accept_order(current_setting('test.order_id')::uuid)::text, true);
select is(accept_order(current_setting('test.order_id')::uuid)::text, current_setting('test.seller_charge'), 'accepting twice reuses the charge');
select throws_ok($$select get_order_contacts(current_setting('test.order_id')::uuid)$$, 'P0001', 'FORBIDDEN', 'contacts stay locked until the seller pays');
reset role;
select is(test_helpers.pay(current_setting('test.seller_charge')::uuid, 'order_s1'), 'paid', 'the seller fee is received');
select is((select status::text from orders where id = current_setting('test.order_id')::uuid), 'accepted', 'payment accepts the order');

set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000e1');
select is(get_order_contacts(current_setting('test.order_id')::uuid) ->> 'phone', '9000000000', 'the buyer sees the seller phone after unlock');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000e2');
select is(get_order(current_setting('test.order_id')::uuid) ->> 'consigneeName', 'Plant Stores', 'the seller sees the consignee after unlock');

-- Dispatch
select set_config('test.bill', register_order_file('e0000000-0000-0000-0000-000000000002/bill.pdf', 'application/pdf', 100, 'hash')::text, true);
select throws_ok($$select register_order_file('e0000000-0000-0000-0000-000000000001/x.pdf', 'application/pdf', 100, 'hash')$$, 'P0001', 'VALIDATION_FAILED', 'files must sit in the owner folder');
select throws_ok(format($$select dispatch_order(%L, '[{"kind":"product_bill","notApplicableReason":"None"},{"kind":"eway_bill","notApplicableReason":"Under limit"},{"kind":"transport_bill","referenceNo":"LR1"}]')$$, current_setting('test.order_id')), 'P0001', 'VALIDATION_FAILED', 'a product bill needs a file');
select lives_ok(format($$select dispatch_order(%L, jsonb_build_array(jsonb_build_object('kind', 'product_bill', 'fileId', %L), jsonb_build_object('kind', 'eway_bill', 'notApplicableReason', 'Under limit'), jsonb_build_object('kind', 'transport_bill', 'referenceNo', 'LR1')))$$, current_setting('test.order_id'), current_setting('test.bill')), 'the seller dispatches');

select test_helpers.act_as('00000000-0000-0000-0000-0000000000e1');
select is(get_order(current_setting('test.order_id')::uuid) -> 'documents' -> 1 ->> 'readable', 'false', 'the buyer cannot open an unscanned PDF');

-- Receipt
select set_config('test.proof', register_order_file('e0000000-0000-0000-0000-000000000001/proof.webp', 'image/webp', 100, 'hash')::text, true);
select lives_ok(format($$select receive_order(%L, %L)$$, current_setting('test.order_id'), current_setting('test.proof')), 'the buyer confirms receipt');
reset role;
select is((select status::text from orders where id = current_setting('test.order_id')::uuid), 'completed', 'the order completes');
select is((select count(*) from tax_invoices where charge_id in (current_setting('test.buyer_charge')::uuid, current_setting('test.seller_charge')::uuid)), 2::bigint, 'both fees get a tax invoice');
select is(test_helpers.bucket('e0000000-0000-0000-0000-000000000001', 'paid'), 212::bigint, 'the held fee becomes paid');

-- Rejection
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000e1');
select set_config('test.order2', test_helpers.place(1)::text, true);
reset role;
select test_helpers.pay((current_setting('test.order2')::jsonb ->> 'chargeId')::uuid, 'order_b2');
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000e2');
select lives_ok(format($$select reject_order(%L, 'Out of stock')$$, current_setting('test.order2')::jsonb ->> 'orderId'), 'the seller rejects');
reset role;
select is(test_helpers.bucket('e0000000-0000-0000-0000-000000000001', 'available'), 106::bigint, 'rejection returns the fee to the wallet');
select is((select stock_qty from products where id = 'e2000000-0000-0000-0000-000000000001'), 8.000, 'rejection returns the stock');

select * from finish();
rollback;
