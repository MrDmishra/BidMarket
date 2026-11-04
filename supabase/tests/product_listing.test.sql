begin;
select plan(22);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'seller@example.com'),
  ('00000000-0000-0000-0000-0000000000c2', 'buyer2@example.com'),
  ('00000000-0000-0000-0000-0000000000c3', 'admin2@example.com'),
  ('00000000-0000-0000-0000-0000000000c4', 'rival@example.com');
insert into organisations (id, kind, entity_type, legal_name, pan_enc, pan_hmac, gstin, status) values
  ('c0000000-0000-0000-0000-000000000001', 'seller', 'company', 'Seller One', 'x', 's1', '08AABCS1234F1Z5', 'pending_payment'),
  ('c0000000-0000-0000-0000-000000000002', 'seller', 'company', 'Rival Seller', 'x', 's2', '08AABCS1235F1Z5', 'active'),
  ('c0000000-0000-0000-0000-000000000003', 'buyer', 'company', 'Buyer Two', 'x', 's3', null, 'active');
update profiles set org_id = 'c0000000-0000-0000-0000-000000000001' where email = 'seller@example.com';
update profiles set org_id = 'c0000000-0000-0000-0000-000000000003' where email = 'buyer2@example.com';
update profiles set org_id = 'c0000000-0000-0000-0000-000000000002' where email = 'rival@example.com';
update profiles set role = 'admin' where email = 'admin2@example.com';

create schema test_helpers;
create function test_helpers.category(p_slug text) returns uuid language sql as $$
  select id from public.categories where slug = p_slug;
$$;
create function test_helpers.spec(p_slug text, p_key text) returns uuid language sql as $$
  select d.id from public.spec_definitions d join public.categories c on c.id = d.category_id
  where c.slug = p_slug and d.key = p_key;
$$;
create function test_helpers.act_as(p_id text, p_aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_id, true);
  select set_config('request.jwt.claims', json_build_object('aal', p_aal)::text, true);
$$;
create function test_helpers.save(p_discount integer default 1500) returns uuid language sql as $$
  select public.save_product(null, test_helpers.category('hardware'), 'Brass ball valve', 'Forged', 78000, p_discount, 10, 'pc',
    array['08'], jsonb_build_array(jsonb_build_object('specId', test_helpers.spec('hardware', 'material'), 'value', 'Brass')));
$$;
grant usage on schema test_helpers to authenticated;
grant execute on all functions in schema test_helpers to authenticated;

set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000c1');
select throws_ok($$select test_helpers.save()$$, 'P0001', 'ACCOUNT_NOT_ACTIVE', 'sellers must be active to list');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000c2');
select throws_ok($$select test_helpers.save()$$, 'P0001', 'FORBIDDEN', 'buyers cannot list products');

select test_helpers.act_as('00000000-0000-0000-0000-0000000000c1');
select throws_ok($$select admin_test_activate_seller('c0000000-0000-0000-0000-000000000001', 'self')$$, 'P0001', 'FORBIDDEN', 'sellers cannot activate themselves');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000c3');
select throws_ok($$select admin_test_activate_seller('c0000000-0000-0000-0000-000000000001', 'test')$$, 'P0001', 'FORBIDDEN', 'test activation needs two-step login');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000c3', 'aal2');
select throws_ok($$select admin_test_activate_seller('c0000000-0000-0000-0000-000000000001', '')$$, 'P0001', 'VALIDATION_FAILED', 'test activation needs a reason');
select lives_ok($$select admin_test_activate_seller('c0000000-0000-0000-0000-000000000001', 'Owner testing')$$, 'admin activates a seller for testing');
select throws_ok($$select admin_test_activate_seller('c0000000-0000-0000-0000-000000000001', 'Again')$$, 'P0001', 'INVALID_STATE', 'only pending sellers can be activated');

select test_helpers.act_as('00000000-0000-0000-0000-0000000000c1');
select lives_ok($$select test_helpers.save(500)$$, 'a low discount can be saved as a draft');
select throws_ok($$select submit_product((select id from seller_products() limit 1))$$, 'P0001', 'VALIDATION_FAILED', 'submission needs the minimum discount');
select is((select count(*) from seller_products()), 1::bigint, 'seller sees own product');

select save_product(id, category_id, title, description, mrp_paise, 1500, stock_qty, unit, array['08'],
  jsonb_build_array(jsonb_build_object('specId', test_helpers.spec('hardware', 'material'), 'value', 'Brass')))
from seller_products();
select is((select net_paise from seller_products()), 66300::bigint, 'saving a draft recalculates the net price');
select lives_ok($$select submit_product((select id from seller_products() limit 1))$$, 'a complete product can be submitted');
select throws_ok($$select save_product(id, category_id, 'Changed', '', 100, 1000, 1, 'pc', array['08'], '[]') from seller_products()$$, 'P0001', 'INVALID_STATE', 'pending products cannot be edited');

select test_helpers.act_as('00000000-0000-0000-0000-0000000000c4');
select is((select count(*) from seller_products()), 0::bigint, 'rivals cannot see the product');
select throws_ok($$select set_product_visibility((select id from products limit 1), false)$$, '42501', null, 'rivals cannot read the table');

select test_helpers.act_as('00000000-0000-0000-0000-0000000000c1');
select throws_ok($$select admin_pending_products()$$, 'P0001', 'FORBIDDEN', 'sellers cannot open the product queue');

select test_helpers.act_as('00000000-0000-0000-0000-0000000000c3', 'aal2');
select is((select count(*) from admin_pending_products()), 1::bigint, 'admin sees the product queue');
select lives_ok($$select admin_review_product((select id from admin_pending_products()), 'published', 'Listing is clear')$$, 'admin publishes');

set local role anon;
select is((select count(*) from search_products(p_query := 'valve')), 1::bigint, 'published product is public');
reset role;

set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000c1');
select lives_ok($$select update_product_commercials((select id from seller_products() limit 1), 80000, 2000, 5)$$, 'published prices can change without review');
select lives_ok($$select set_product_visibility((select id from seller_products() limit 1), false)$$, 'seller can unpublish');
reset role;

set local role anon;
select is((select count(*) from search_products(p_query := 'valve')), 0::bigint, 'unpublished product leaves the catalogue');
reset role;

select * from finish();
rollback;
