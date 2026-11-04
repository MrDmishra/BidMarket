begin;
select plan(19);

insert into organisations (id, kind, entity_type, legal_name, pan_enc, pan_hmac, gstin, status) values
  ('a0000000-0000-0000-0000-000000000001', 'seller', 'company', 'Hidden Seller Ltd', 'x', 'p1', '23AABCN1234F1Z5', 'active'),
  ('a0000000-0000-0000-0000-000000000002', 'seller', 'company', 'Paused Seller Ltd', 'x', 'p2', '23AABCN1235F1Z5', 'active');
update organisations set maintenance = true where legal_name = 'Paused Seller Ltd';
insert into org_addresses (org_id, label, line1, city, state_code, pincode, is_registered) values
  ('a0000000-0000-0000-0000-000000000001', 'Registered office', '1 Road', 'Jabalpur', '23', '482001', true);

insert into products (id, seller_org_id, category_id, title, mrp_paise, discount_bps, unit, stock_qty, status, order_count)
select v.id::uuid, v.org::uuid, c.id, v.title, v.mrp, v.disc, 'pc', 5, v.status::product_status, v.orders
from categories c, (values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Copper armoured cable', 92000, 1400, 'published', 5),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'LED high-bay light', 62000, 2200, 'published', 9),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Draft cable', 1000, 0, 'draft', 0),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Paused cable', 1000, 0, 'published', 0)
) as v (id, org, title, mrp, disc, status, orders)
where c.slug = 'electrical';
insert into product_states values ('b0000000-0000-0000-0000-000000000001', '23');

select is((select net_paise from products where title = 'Copper armoured cable'), 79120::bigint, 'net price comes from MRP and discount');
select ok((select display_no from products where title = 'LED high-bay light') ~ '^BMP-[0-9]{6}$', 'products get a display number');
select throws_ok($$update products set discount_bps = 9500 where title = 'Draft cable'$$, '23514', null, 'discount has a ceiling');

set local role anon;
select is((select count(*) from categories where parent_id is null), 16::bigint, 'visitors see active categories');
select is((select count(*) from categories where parent_id is not null), 110::bigint, 'visitors see the sub-categories');
select is((select count(*) from categories c join categories p on p.id = c.parent_id where p.parent_id is not null), 0::bigint, 'sub-categories sit one level below a main category');
select is((select count(*) from categories c where c.parent_id is null and not exists (select from categories s where s.parent_id = c.id)), 0::bigint, 'every main category has sub-categories');
select throws_ok($$select * from products$$, '42501', null, 'visitors cannot read the products table');
select throws_ok($$select * from product_states$$, '42501', null, 'visitors cannot read product states');
select is((select count(*) from search_products()), 2::bigint, 'only published products of open sellers appear');
select is((select title from search_products() limit 1), 'LED high-bay light', 'default sort is most ordered');
select is((select title from search_products(p_sort := 'price_low') limit 1), 'LED high-bay light', 'sorts by net price');
select is((select count(*) from search_products(p_query := 'copper')), 1::bigint, 'text search matches');
select is((select count(*) from search_products(p_state_code := '23')), 1::bigint, 'state filter works');
select is((select count(*) from search_products(p_category_slug := 'sports')), 0::bigint, 'category filter works');
select is((select city from search_products(p_query := 'copper')), 'Jabalpur', 'shows the seller city');
select unalike((select to_jsonb(p)::text from search_products() p limit 1), '%Hidden Seller%', 'search never reveals the seller');
select unalike((select to_jsonb(p)::text from public_product('b0000000-0000-0000-0000-000000000001') p), '%Hidden Seller%', 'detail never reveals the seller');
select is((select count(*) from public_product('b0000000-0000-0000-0000-000000000003')), 0::bigint, 'drafts have no public page');
reset role;

select * from finish();
rollback;
