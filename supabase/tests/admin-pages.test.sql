begin;
select plan(10);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'seller@example.com'),
  ('00000000-0000-0000-0000-0000000000d2', 'admin@example.com');
insert into organisations (id, kind, entity_type, legal_name, pan_enc, pan_hmac, gstin, status) values
  ('d0000000-0000-0000-0000-000000000001', 'seller', 'company', 'Selling Co', 'x', 'd1', '08AABCN1234F1Z5', 'active');
update profiles set org_id = 'd0000000-0000-0000-0000-000000000001' where email = 'seller@example.com';
update profiles set role = 'admin' where email = 'admin@example.com';
insert into products (id, seller_org_id, category_id, title, mrp_paise, discount_bps, unit, stock_qty, status)
select 'd2000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', c.id, 'Brass valve', 100000, 1000, 'pc', 10, 'published'
from categories c where c.slug = 'hardware';
insert into audit_log (actor_role, action, entity_type, entity_id)
select 'system', 'test.entry', 'test', g::text from generate_series(1, 30) g;

create schema test_helpers;
create function test_helpers.act_as(p_id text, p_aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_id, true);
  select set_config('request.jwt.claims', json_build_object('aal', p_aal)::text, true);
$$;
create function test_helpers.product_status() returns text language sql security definer as $$
  select status::text from public.products where id = 'd2000000-0000-0000-0000-000000000001';
$$;
grant usage on schema test_helpers to authenticated;
grant execute on all functions in schema test_helpers to authenticated;

set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000d1');
select throws_ok($$select admin_product('d2000000-0000-0000-0000-000000000001')$$, 'P0001', 'FORBIDDEN', 'a seller cannot use admin product tools');
select throws_ok($$select admin_take_down_product('d2000000-0000-0000-0000-000000000001', 'Wrong photos')$$, 'P0001', 'FORBIDDEN',
  'a seller cannot take down products');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000d2', 'aal2');
select is(admin_product('d2000000-0000-0000-0000-000000000001') ->> 'sellerName', 'Selling Co', 'support sees the seller of a product');
select throws_ok($$select admin_take_down_product('d2000000-0000-0000-0000-000000000001', '')$$, 'P0001', 'VALIDATION_FAILED',
  'taking a product down needs a reason');
select lives_ok($$select admin_take_down_product('d2000000-0000-0000-0000-000000000001', 'Photos do not match the title')$$,
  'support takes a live product down');
select is(test_helpers.product_status(), 'notify', 'the product goes back to the seller for changes');
select throws_ok($$select admin_take_down_product('d2000000-0000-0000-0000-000000000001', 'Again')$$, 'P0001', 'INVALID_STATE',
  'a product that is not live cannot be taken down');
select is((select count(*) from admin_audit_log_page('test', null, null, 1, 25)), 25::bigint, 'the first page holds 25 entries');
select is((select count(*) from admin_audit_log_page('test', null, null, 2, 25)), 5::bigint, 'the second page holds the rest');
select is((select max(total_count) from admin_audit_log_page('test', null, null, 2, 25)), 30::bigint, 'every page knows the total');
reset role;

select * from finish();
rollback;
