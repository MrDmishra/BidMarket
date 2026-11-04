begin;
select plan(39);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'seller@example.com'),
  ('00000000-0000-0000-0000-0000000000d2', 'rival@example.com'),
  ('00000000-0000-0000-0000-0000000000d3', 'admin@example.com');
insert into organisations (id, kind, entity_type, legal_name, pan_enc, pan_hmac, gstin, status) values
  ('d0000000-0000-0000-0000-000000000001', 'seller', 'company', 'Local Seller Ltd', 'x', 'd1', '08AABCN1234F1Z5', 'pending_payment'),
  ('d0000000-0000-0000-0000-000000000002', 'seller', 'company', 'Other State Ltd', 'x', 'd2', '23AABCN1235F1Z5', 'pending_payment');
insert into org_addresses (org_id, label, line1, city, state_code, pincode, is_registered) values
  ('d0000000-0000-0000-0000-000000000001', 'Registered office', '1 Road', 'Jaipur', '08', '302001', true),
  ('d0000000-0000-0000-0000-000000000002', 'Registered office', '2 Road', 'Indore', '23', '452001', true);
insert into turnover_declarations (org_id, financial_year, amount_paise) values
  ('d0000000-0000-0000-0000-000000000001', '2023-24', 10000000000),
  ('d0000000-0000-0000-0000-000000000001', '2024-25', 15000000000),
  ('d0000000-0000-0000-0000-000000000001', '2025-26', 15000000000),
  ('d0000000-0000-0000-0000-000000000002', '2023-24', 10000000000),
  ('d0000000-0000-0000-0000-000000000002', '2024-25', 5000000000),
  ('d0000000-0000-0000-0000-000000000002', '2025-26', 10500000000);
update profiles set org_id = 'd0000000-0000-0000-0000-000000000001' where email = 'seller@example.com';
update profiles set org_id = 'd0000000-0000-0000-0000-000000000002' where email = 'rival@example.com';
update profiles set role = 'admin' where email = 'admin@example.com';

create schema test_helpers;
create function test_helpers.act_as(p_id text, p_aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_id, true);
  select set_config('request.jwt.claims', json_build_object('aal', p_aal)::text, true);
$$;
create function test_helpers.seller_charge() returns uuid language sql security definer as $$
  select id from public.fee_charges where org_id = 'd0000000-0000-0000-0000-000000000001' order by created_at desc limit 1;
$$;
grant usage on schema test_helpers to authenticated, service_role;
grant execute on all functions in schema test_helpers to authenticated, service_role;

select is((select count(*) from platform_settings), 1::bigint, 'settings are seeded');
select throws_ok($$update platform_settings set gst_bps = 0$$, 'P0001', null, 'settings cannot be changed in place');

-- Quote and charge
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000d1');
select is((quote_subscription() ->> 'feePaise')::bigint, 2650000::bigint, '₹40 crore over three years pays ₹26,500');
select lives_ok($$select start_subscription()$$, 'seller starts a subscription');
select is(start_subscription(), test_helpers.seller_charge(), 'starting again reuses the pending charge');
reset role;
select is((select total_paise from fee_charges where id = test_helpers.seller_charge()), 3127000::bigint, 'the total includes 18% GST');
select is((select cgst_paise from fee_charges where id = test_helpers.seller_charge()), 238500::bigint, 'same state pays CGST');
select is((select sgst_paise from fee_charges where id = test_helpers.seller_charge()), 238500::bigint, 'same state pays SGST');
select is((select igst_paise from fee_charges where id = test_helpers.seller_charge()), 0::bigint, 'same state pays no IGST');

set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000d2');
select is((quote_subscription() ->> 'feePaise')::bigint, 2500000::bigint, '₹25.5 crore stays at ₹25,000');
select start_subscription();
reset role;
select is((select igst_paise from fee_charges where org_id = 'd0000000-0000-0000-0000-000000000002'), 450000::bigint, 'another state pays IGST');

-- Access
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000d2');
select is((select count(*) from fee_charges), 1::bigint, 'a seller sees only their own charges');
select throws_ok(format($$select begin_checkout(%L)$$, test_helpers.seller_charge()), 'P0001', 'NOT_FOUND', 'a rival cannot pay or inspect another charge');
select throws_ok($$insert into wallet_entries (org_id, to_bucket, amount_paise, reason) values ('d0000000-0000-0000-0000-000000000002', 'available', 100, 'x')$$, '42501', null, 'users cannot write the wallet');
select throws_ok($$update fee_charges set status = 'paid'$$, '42501', null, 'users cannot mark a charge paid');
select throws_ok($$select apply_payment_event('e', 'payment.captured', 'o', 'p', 1, null)$$, '42501', null, 'users cannot call the payment event');

-- Checkout
select test_helpers.act_as('00000000-0000-0000-0000-0000000000d1');
select is((begin_checkout(test_helpers.seller_charge()) ->> 'amountPaise')::bigint, 3127000::bigint, 'checkout asks for the full total');
select is(
  record_provider_order(((begin_checkout(test_helpers.seller_charge())) ->> 'paymentId')::uuid, 'order_1'),
  'order_1', 'the provider order is stored');
select is(
  record_provider_order(((begin_checkout(test_helpers.seller_charge())) ->> 'paymentId')::uuid, 'order_2'),
  'order_1', 'the first provider order wins');
reset role;

-- Payment events
set local role service_role;
select is(apply_payment_event('evt_0', 'payment.captured', 'unknown', 'pay_0', 100, null), 'unknown_order', 'unknown orders are recorded and ignored');
select is(apply_payment_event('evt_1', 'payment.captured', 'order_1', 'pay_1', 100, null), 'amount_mismatch', 'a wrong amount does not settle');
reset role;
select is((select status::text from fee_charges where id = test_helpers.seller_charge()), 'pending', 'the charge stays pending after a mismatch');
select is((select status::text from organisations where legal_name = 'Local Seller Ltd'), 'pending_payment', 'the seller stays pending after a mismatch');

set local role service_role;
select is(apply_payment_event('evt_2', 'payment.failed', 'order_1', null, 3127000, 'Card declined'), 'failed', 'a failed payment is recorded');
select is(apply_payment_event('evt_3', 'payment.captured', 'order_1', 'pay_1', 3127000, null), 'paid', 'a later capture settles the charge');
select is(apply_payment_event('evt_3', 'payment.captured', 'order_1', 'pay_1', 3127000, null), 'duplicate', 'a repeated event is ignored');
select is(apply_payment_event('evt_4', 'order.paid', 'order_1', 'pay_1', 3127000, null), 'already_paid', 'a second paid event does nothing');
select is(apply_payment_event('evt_5', 'payment.failed', 'order_1', null, 3127000, 'Late'), 'already_paid', 'a late failure cannot undo payment');
reset role;

select is((select status::text from organisations where legal_name = 'Local Seller Ltd'), 'active', 'payment activates the seller');
select is((select count(*) from wallet_entries where charge_id = test_helpers.seller_charge()), 1::bigint, 'payment writes one ledger entry');
select is((select count(*) from tax_invoices where charge_id = test_helpers.seller_charge()), 1::bigint, 'payment issues one invoice');
select matches((select invoice_no from tax_invoices where charge_id = test_helpers.seller_charge()), '^BM/\d{4}-\d{2}/000001$', 'the invoice number has the expected form');
select is((select count(*) from outbox where template = 'charge_paid'), 1::bigint, 'the seller is notified once');
select throws_ok($$delete from wallet_entries$$, 'P0001', null, 'the wallet is append-only');

set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000d1');
select is((select paid_paise from wallet_summary()), 3127000::bigint, 'the wallet shows the paid total');
reset role;

-- Settings
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000d1');
select throws_ok($$select admin_save_settings(10, 50, 1800, 0, 2500000, 10000, 0, 'x')$$, 'P0001', 'FORBIDDEN', 'sellers cannot change settings');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000d3', 'aal2');
select throws_ok($$select admin_save_settings(10, 50, 1800, 0, 2500000, 10000, 0, ' ')$$, 'P0001', 'VALIDATION_FAILED', 'a settings change needs a reason');
select lives_ok($$select admin_save_settings(10, 50, 1800, 0, 2500000, 10000, 5, 'Launch offer')$$, 'admin adds a new settings row');

-- Free first subscriptions
select test_helpers.act_as('00000000-0000-0000-0000-0000000000d2');
reset role;
update subscriptions set status = 'cancelled' where org_id = 'd0000000-0000-0000-0000-000000000002';
set local role authenticated;
select is((quote_subscription() ->> 'free')::boolean, true, 'early sellers get the free year');
reset role;

select * from finish();
rollback;
