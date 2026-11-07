begin;
select plan(8);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'buyer@example.com'),
  ('00000000-0000-0000-0000-0000000000c2', 'seller@example.com'),
  ('00000000-0000-0000-0000-0000000000c3', 'admin@example.com');
insert into organisations (id, kind, entity_type, legal_name, pan_enc, pan_hmac, gstin, status) values
  ('c0000000-0000-0000-0000-000000000001', 'buyer', 'company', 'Buying Co', 'x', 'c1', '08AABCN1234F1Z5', 'active'),
  ('c0000000-0000-0000-0000-000000000002', 'seller', 'company', 'Selling Co', 'x', 'c2', '08AABCN1235F1Z5', 'active');
update profiles set org_id = 'c0000000-0000-0000-0000-000000000001' where email = 'buyer@example.com';
update profiles set org_id = 'c0000000-0000-0000-0000-000000000002' where email = 'seller@example.com';
update profiles set role = 'admin' where email = 'admin@example.com';
insert into orders (id, order_no, buyer_org_id, seller_org_id, title, unit, quantity, unit_paise, total_paise,
  payment_terms, consignee_name, delivery_address, status, settings_id)
select 'c3000000-0000-0000-0000-000000000001', 'BMO-26-800001', 'c0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000002', 'Brass valve', 'pc', 10, 1000, 10000, 'advance', 'Stores', '{}'::jsonb,
  'dispatched', id
from platform_settings order by effective_from desc limit 1;
insert into files (id, bucket, path, owner_org_id, uploaded_by, mime_type, size_bytes, sha256) values
  ('c4000000-0000-0000-0000-000000000001', 'order-documents', 'c0000000-0000-0000-0000-000000000002/bill.pdf',
   'c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000c2', 'application/pdf', 1000, 'x');
insert into order_documents (order_id, kind, file_id) values
  ('c3000000-0000-0000-0000-000000000001', 'product_bill', 'c4000000-0000-0000-0000-000000000001');

create schema test_helpers;
create function test_helpers.act_as(p_id text, p_aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_id, true);
  select set_config('request.jwt.claims', json_build_object('aal', p_aal)::text, true);
$$;
grant usage on schema test_helpers to authenticated;
grant execute on all functions in schema test_helpers to authenticated;

set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000c1');
select ok(not can_read_order_file('c0000000-0000-0000-0000-000000000002/bill.pdf'), 'the buyer cannot open an unchecked bill');
select throws_ok($$select * from admin_pending_files()$$, 'P0001', 'FORBIDDEN', 'only support sees the queue');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000c3', 'aal2');
select is((select order_no from admin_pending_files()), 'BMO-26-800001', 'support sees the file with its order');
select ok(can_read_order_file('c0000000-0000-0000-0000-000000000002/bill.pdf'), 'support can open it to check');
select throws_ok($$select admin_review_file('c4000000-0000-0000-0000-000000000001', true, '')$$, 'P0001', 'VALIDATION_FAILED',
  'marking a file needs a reason');
select lives_ok($$select admin_review_file('c4000000-0000-0000-0000-000000000001', true, 'Opened and checked, a normal invoice')$$,
  'support marks the file clean');
select throws_ok($$select admin_review_file('c4000000-0000-0000-0000-000000000001', false, 'Second look')$$, 'P0001', 'INVALID_STATE',
  'a reviewed file is not reviewed again');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000c1');
select ok(can_read_order_file('c0000000-0000-0000-0000-000000000002/bill.pdf'), 'the buyer can open the bill once it is clean');
reset role;

select * from finish();
rollback;
