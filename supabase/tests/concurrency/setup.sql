-- Ten eligible sellers and four live auctions, committed so parallel sessions can see them.
insert into auth.users (id, email)
select ('00000000-0000-0000-0000-0000000001' || lpad(n::text, 2, '0'))::uuid, 'race' || n || '@example.com'
from generate_series(0, 10) as n;

insert into organisations (id, kind, entity_type, legal_name, pan_enc, pan_hmac, gstin, status)
select ('c0000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid, case when n = 0 then 'buyer' else 'seller' end::org_kind,
  'company', 'Race ' || n, 'x', convert_to('race' || n, 'utf8'), '08AABCN' || lpad(n::text, 4, '0') || 'F1Z5', 'active'
from generate_series(0, 10) as n;

update profiles p set org_id = ('c0000000-0000-0000-0000-0000000000' || right(p.user_id::text, 2))::uuid
where p.email like 'race%@example.com';

insert into org_addresses (id, org_id, label, line1, city, state_code, pincode, is_registered)
values ('c1000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000000', 'Registered office', '1 Road', 'Jaipur', '08', '302001', true);

insert into products (id, seller_org_id, category_id, title, mrp_paise, discount_bps, unit, stock_qty, status)
select ('c2000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid,
  ('c0000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid, c.id, 'Race valve', 100000, 1000, 'pc', 10, 'published'
from generate_series(1, 10) as n, categories c where c.slug = 'hardware';
insert into product_states (product_id, state_code)
select ('c2000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid, '08' from generate_series(1, 10) as n;

insert into tenders (
  id, tender_no, buyer_org_id, type, kind, status, category_id, title, quantity, unit, estimate_unit_paise, payment_terms,
  consignee_name, consignee_gstin, consignee_address_id, delivery_state_code, contract_months, bid_ends_at, ra_starts_at,
  ra_ends_at, settings_id, product_id
)
select ('d1000000-0000-0000-0000-00000000000' || n)::uuid, 'RACE-' || n, 'c0000000-0000-0000-0000-000000000000', 'ra', 'custom',
  'auction', c.id, 'Race auction', 100, 'pc', 100000, 'advance', 'Stores', '08AABCN1234F1Z5',
  'c1000000-0000-0000-0000-000000000000', '08', 12, now() + interval '1 hour', now() - interval '1 minute',
  now() + interval '1 hour', (select id from platform_settings order by effective_from desc limit 1), null
from generate_series(1, 4) as n, categories c where c.slug = 'hardware';
