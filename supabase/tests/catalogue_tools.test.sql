begin;
select plan(19);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'tools-seller@example.com'),
  ('00000000-0000-0000-0000-0000000000d2', 'tools-admin@example.com');
insert into organisations (id, kind, entity_type, legal_name, pan_enc, pan_hmac, gstin, status) values
  ('d0000000-0000-0000-0000-000000000001', 'seller', 'company', 'Tools Seller', 'x', 't1', '08AABCS1234F1Z5', 'active');
update profiles set org_id = 'd0000000-0000-0000-0000-000000000001' where email = 'tools-seller@example.com';
update profiles set role = 'admin' where email = 'tools-admin@example.com';
insert into products (id, seller_org_id, category_id, title, mrp_paise, discount_bps, unit, stock_qty, status)
select 'e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', id, 'Stocked item', 1000, 1000, 'pc', 5, 'draft'
from categories where slug = 'sports';
insert into products (id, seller_org_id, category_id, title, mrp_paise, discount_bps, unit, stock_qty, status)
select 'e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', id, 'Empty item', 1000, 1000, 'pc', 0, 'draft'
from categories where slug = 'sports';

create schema test_helpers;
create function test_helpers.act_as(p_id text, p_aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_id, true);
  select set_config('request.jwt.claims', json_build_object('aal', p_aal)::text, true);
$$;
grant usage on schema test_helpers to authenticated, anon;
grant execute on all functions in schema test_helpers to authenticated, anon;

set local role anon;
select ok(health_check(), 'health check works for visitors');
select throws_ok($$select api_begin('12345678', 'r', 'h')$$, '42501', null, 'visitors cannot use the write guard');
reset role;

set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000d1');
select is(api_begin('key-00001', '/r', 'hash'), null, 'a new key proceeds');
select throws_ok($$select api_begin('key-00001', '/r', 'hash')$$, 'P0001', 'INVALID_STATE', 'a running request cannot start twice');
select lives_ok($$select api_finish('key-00001', 201, '{"data":1}')$$, 'a result is saved');
select is((api_begin('key-00001', '/r', 'hash') ->> 'status')::int, 201, 'a repeat returns the saved status');
select throws_ok($$select api_begin('key-00001', '/r', 'other')$$, 'P0001', 'IDEMPOTENCY_CONFLICT', 'a changed body is refused');
select is(api_begin('key-00002', '/r', 'hash'), null, 'another key proceeds');
select lives_ok($$select api_finish('key-00002', 500, null)$$, 'a failure is recorded');
select is(api_begin('key-00002', '/r', 'hash'), null, 'a failed request can be retried');
select throws_ok($$select api_begin('k' || n || '-000000', '/r', 'h') from generate_series(1, 70) as n$$, 'P0001', 'RATE_LIMITED', 'writes are rate limited');

select throws_ok($$select delete_product('e0000000-0000-0000-0000-000000000001')$$, 'P0001', 'INVALID_STATE', 'products with stock cannot be deleted');
select lives_ok($$select delete_product('e0000000-0000-0000-0000-000000000002')$$, 'products with no stock can be deleted');
select lives_ok($$select request_category('Solar equipment', 'Panels and inverters')$$, 'sellers can request a category');
select throws_ok($$select admin_pending_category_requests()$$, 'P0001', 'FORBIDDEN', 'sellers cannot read the request queue');
select throws_ok($$select admin_save_category(null, null, 'Hack', 'hack', '', true, 1)$$, 'P0001', 'FORBIDDEN', 'sellers cannot change categories');

select test_helpers.act_as('00000000-0000-0000-0000-0000000000d2', 'aal2');
select lives_ok($$select admin_review_category_request((select id from admin_pending_category_requests()), true, 'Good demand')$$, 'admin approves a request');
select is((select count(*) from categories where slug = 'solar-equipment'), 1::bigint, 'approval creates the category');
select lives_ok($$select admin_add_spec((select id from categories where slug = 'solar-equipment'), 'Rated power', 'number', 'W', true, false)$$, 'admin adds a specification');
reset role;

select * from finish();
rollback;
