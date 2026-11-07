begin;
select plan(40);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'buyer@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'seller@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'stranger@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'admin@example.com');
insert into organisations (id, kind, entity_type, legal_name, pan_enc, pan_hmac, gstin, status) values
  ('e0000000-0000-0000-0000-000000000001', 'buyer', 'company', 'Buying Co', 'x', 'e1', '08AABCN1234F1Z5', 'active'),
  ('e0000000-0000-0000-0000-000000000002', 'seller', 'company', 'Selling Co', 'x', 'e2', '08AABCN1235F1Z5', 'active'),
  ('e0000000-0000-0000-0000-000000000003', 'buyer', 'company', 'Stranger Co', 'x', 'e3', '08AABCN1236F1Z5', 'active');
update profiles set org_id = 'e0000000-0000-0000-0000-000000000001' where email = 'buyer@example.com';
update profiles set org_id = 'e0000000-0000-0000-0000-000000000002' where email = 'seller@example.com';
update profiles set org_id = 'e0000000-0000-0000-0000-000000000003' where email = 'stranger@example.com';
update profiles set role = 'admin' where email = 'admin@example.com';
insert into orders (id, order_no, buyer_org_id, seller_org_id, title, unit, quantity, unit_paise, total_paise,
  payment_terms, consignee_name, delivery_address, status, settings_id)
select 'e3000000-0000-0000-0000-000000000001', 'BMO-26-900001', 'e0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000002', 'Brass valve', 'pc', 10, 1000, 10000, 'advance', 'Stores',
  '{}'::jsonb, 'accepted', id
from platform_settings order by effective_from desc limit 1;

create schema test_helpers;
create function test_helpers.act_as(p_id text, p_aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_id, true);
  select set_config('request.jwt.claims', json_build_object('aal', p_aal)::text, true);
$$;
create function test_helpers.org(p_id uuid) returns public.organisations language sql security definer as $$
  select * from public.organisations where id = p_id;
$$;
create function test_helpers.audit_count(p_action text) returns bigint language sql security definer as $$
  select count(*) from public.audit_log where action = p_action;
$$;
grant usage on schema test_helpers to authenticated;
grant execute on all functions in schema test_helpers to authenticated;

-- Incidents
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000e1');
select throws_ok($$select raise_incident(null, null, null, 'Goods arrived damaged')$$, 'P0001', 'VALIDATION_FAILED',
  'an incident needs a reference');
select throws_ok($$select raise_incident('e3000000-0000-0000-0000-000000000001', null, null, 'short')$$, 'P0001', 'VALIDATION_FAILED',
  'an incident needs a real description');
select set_config('test.i1', raise_incident('e3000000-0000-0000-0000-000000000001', null, null, 'Goods arrived damaged')::text, true);
select matches((get_incident(current_setting('test.i1')::uuid) ->> 'refNo'), '^BM/\d{2}/INC/\d{5}$', 'an incident gets a reference number');
select is((get_incident(current_setting('test.i1')::uuid) ->> 'role'), 'raiser', 'the raiser sees their role');
select is((get_incident(current_setting('test.i1')::uuid) ->> 'against'), null, 'parties never see the other side by name');
select lives_ok(format($$select add_incident_message(%L, 'Photos attached in the order')$$, current_setting('test.i1')), 'the raiser adds a message');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000e2');
select is((get_incident(current_setting('test.i1')::uuid) ->> 'role'), 'other_party', 'the other party can open the incident');
select is((get_incident(current_setting('test.i1')::uuid) -> 'messages' -> 0 ->> 'author'), 'other_party', 'messages show the author by role only');
select is((select count(*) from my_attention() where kind = 'incident'), 1::bigint, 'a waiting reply shows on the dashboard');
select lives_ok(format($$select add_incident_message(%L, 'We will replace it')$$, current_setting('test.i1')), 'the other party replies');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000e3');
select throws_ok(format($$select get_incident(%L)$$, current_setting('test.i1')), 'P0001', 'NOT_FOUND', 'an outsider cannot open the incident');
select throws_ok(format($$select add_incident_message(%L, 'Hello')$$, current_setting('test.i1')), 'P0001', 'NOT_FOUND', 'an outsider cannot post');
select is((select count(*) from incidents), 0::bigint, 'an outsider cannot read incidents directly');
select throws_ok($$select raise_incident('e3000000-0000-0000-0000-000000000001', null, null, 'Not my order at all')$$, 'P0001', 'NOT_FOUND',
  'only a party can raise an incident on an order');
select throws_ok($$insert into incidents (ref_no, raised_by_org_id, raised_by, order_id, description)
  values ('x', 'e0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000e3', 'e3000000-0000-0000-0000-000000000001', 'Written directly')$$,
  '42501', null, 'clients cannot write incidents directly');
reset role;
select throws_ok($$update messages set body = 'changed'$$, 'P0001', 'messages is append-only', 'messages cannot be edited');

-- Tickets
set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000e3');
select set_config('test.t1', raise_ticket('payment', 'Invoice', 'I cannot download my invoice')::text, true);
select matches((get_ticket(current_setting('test.t1')::uuid) ->> 'refNo'), '^BM/\d{2}/TKT/\d{5}$', 'a ticket gets a reference number');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000e1');
select throws_ok(format($$select get_ticket(%L)$$, current_setting('test.t1')), 'P0001', 'NOT_FOUND', 'another user cannot open a ticket');

-- Admin needs the second factor and a reason
select test_helpers.act_as('00000000-0000-0000-0000-0000000000e4', 'aal1');
select throws_ok($$select admin_overview()$$, 'P0001', 'FORBIDDEN', 'admin pages need the second factor');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000e1', 'aal2');
select throws_ok($$select admin_set_org_status('e0000000-0000-0000-0000-000000000002', 'suspend', 'Fraud report')$$, 'P0001', 'FORBIDDEN',
  'a user cannot use admin actions');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000e4', 'aal2');
select is((admin_overview() ->> 'openIncidents')::integer, 1, 'the overview counts open incidents');
select is((admin_overview() ->> 'openTickets')::integer, 1, 'the overview counts open tickets');
select is((get_incident(current_setting('test.i1')::uuid) ->> 'against'), 'Selling Co', 'support sees both sides');
select lives_ok(format($$select add_ticket_message(%L, 'Try again now')$$, current_setting('test.t1')), 'support replies to a ticket');
select throws_ok(format($$select admin_resolve_ticket(%L, 'Invoice re-sent', '')$$, current_setting('test.t1')), 'P0001', 'VALIDATION_FAILED',
  'resolving needs a reason');
select lives_ok(format($$select admin_resolve_ticket(%L, 'Invoice re-sent', 'User confirmed')$$, current_setting('test.t1')), 'support resolves a ticket');
select throws_ok(format($$select admin_decide_incident(%L, 'Seller replaces goods', true, ' ')$$, current_setting('test.i1')), 'P0001', 'VALIDATION_FAILED',
  'a decision needs a reason');
select lives_ok(format($$select admin_decide_incident(%L, 'Seller replaces goods', true, 'Both parties agreed')$$, current_setting('test.i1')),
  'support records a decision');
select is(test_helpers.audit_count('incident.decided'), 1::bigint, 'the decision is in the audit log');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000e1');
select throws_ok(format($$select add_incident_message(%L, 'One more thing')$$, current_setting('test.i1')), 'P0001', 'INVALID_STATE',
  'a closed incident takes no more messages');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000e3');
select lives_ok(format($$select add_ticket_message(%L, 'It failed again')$$, current_setting('test.t1')), 'the user replies after resolution');
select is((get_ticket(current_setting('test.t1')::uuid) ->> 'status'), 'open', 'a reply reopens the ticket');

-- Suspension, blocks and penalties
select test_helpers.act_as('00000000-0000-0000-0000-0000000000e4', 'aal2');
select lives_ok($$select admin_set_org_status('e0000000-0000-0000-0000-000000000002', 'suspend', 'Fraud report')$$, 'support suspends an organisation');
select is((test_helpers.org('e0000000-0000-0000-0000-000000000002')).status::text, 'suspended', 'the organisation is suspended');
select throws_ok($$select admin_set_org_status('e0000000-0000-0000-0000-000000000002', 'suspend', 'Again')$$, 'P0001', 'INVALID_STATE',
  'a suspended organisation cannot be suspended again');
select lives_ok($$select admin_set_org_status('e0000000-0000-0000-0000-000000000002', 'reinstate', 'Cleared')$$, 'support reinstates it');
select set_config('test.p1', admin_block_org('e0000000-0000-0000-0000-000000000002', 30, 'Repeated late delivery')::text, true);
select ok((test_helpers.org('e0000000-0000-0000-0000-000000000002')).blocked_until > now() + interval '29 days', 'a block is applied');
select lives_ok(format($$select admin_waive_penalty(%L, 'Delivery delay was our fault')$$, current_setting('test.p1')), 'support waives the penalty');
select is((test_helpers.org('e0000000-0000-0000-0000-000000000002')).blocked_until, null, 'waiving the only penalty lifts the block');
select is((select count(*) from admin_audit_log('organisation', 'e0000000-0000-0000-0000-000000000002')), 4::bigint,
  'every action on the organisation is in the audit log');
reset role;

select * from finish();
rollback;
