begin;
select plan(15);

insert into auth.users (id, email, last_sign_in_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'buyer@example.com', now()),
  ('00000000-0000-0000-0000-0000000000a2', 'seller@example.com', null),
  ('00000000-0000-0000-0000-0000000000a3', 'admin@example.com', now());
insert into auth.sessions (user_id) values ('00000000-0000-0000-0000-0000000000a2'), ('00000000-0000-0000-0000-0000000000a2');
insert into organisations (id, kind, entity_type, legal_name, pan_enc, pan_hmac, gstin, status) values
  ('a1000000-0000-0000-0000-000000000001', 'buyer', 'company', 'Buying Co', 'x', 'u1', '08AABCN1234F1Z5', 'active'),
  ('a1000000-0000-0000-0000-000000000002', 'seller', 'company', 'Selling Co', 'x', 'u2', '08AABCN1235F1Z5', 'active');
update profiles set org_id = 'a1000000-0000-0000-0000-000000000001' where email = 'buyer@example.com';
update profiles set org_id = 'a1000000-0000-0000-0000-000000000002' where email = 'seller@example.com';
update profiles set role = 'admin' where email = 'admin@example.com';

create schema test_helpers;
create function test_helpers.act_as(p_id text, p_aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_id, true);
  select set_config('request.jwt.claims', json_build_object('aal', p_aal)::text, true);
$$;
create function test_helpers.seller_access() returns table (banned boolean, sessions bigint) language sql security definer as $$
  select coalesce(banned_until > now(), false), (select count(*) from auth.sessions where user_id = u.id)
  from auth.users u where u.id = '00000000-0000-0000-0000-0000000000a2';
$$;
grant usage on schema test_helpers to authenticated;
grant execute on all functions in schema test_helpers to authenticated;

set local role authenticated;
select test_helpers.act_as('00000000-0000-0000-0000-0000000000a1', 'aal2');
select throws_ok($$select * from admin_users()$$, 'P0001', 'FORBIDDEN', 'a buyer cannot list users');
select throws_ok($$select admin_set_user_access('00000000-0000-0000-0000-0000000000a2', true, 'Fraud report')$$, 'P0001', 'FORBIDDEN',
  'a buyer cannot turn off another login');
select test_helpers.act_as('00000000-0000-0000-0000-0000000000a3', 'aal1');
select throws_ok($$select * from admin_users()$$, 'P0001', 'FORBIDDEN', 'user management needs the second factor');

select test_helpers.act_as('00000000-0000-0000-0000-0000000000a3', 'aal2');
select is((select count(*) from admin_users()), 3::bigint, 'support sees every login');
select is((select max(total_count) from admin_users()), 3::bigint, 'each row carries the total for page numbers');
select is((select email from admin_users('selling')), 'seller@example.com', 'search finds a user by organisation name');
select is((select count(*) from admin_users(null, 'admin')), 1::bigint, 'the role filter finds admins');
select is((admin_user('00000000-0000-0000-0000-0000000000a2') ->> 'sessions')::integer, 2, 'the detail shows open sessions');
select is((select count(*) from audit_log where action = 'user.viewed'), 1::bigint, 'opening a user is logged');

select throws_ok($$select admin_set_user_access('00000000-0000-0000-0000-0000000000a2', true, '')$$, 'P0001', 'VALIDATION_FAILED',
  'turning off a login needs a reason');
select throws_ok($$select admin_set_user_access('00000000-0000-0000-0000-0000000000a3', true, 'Testing')$$, 'P0001', 'INVALID_STATE',
  'an admin cannot lock themselves out');
select lives_ok($$select admin_set_user_access('00000000-0000-0000-0000-0000000000a2', true, 'Fraud report')$$, 'support turns off a login');
select results_eq($$select banned, sessions from test_helpers.seller_access()$$, $$values (true, 0::bigint)$$,
  'a turned-off login is blocked and signed out everywhere');
select lives_ok($$select admin_set_user_access('00000000-0000-0000-0000-0000000000a2', false, 'Cleared')$$, 'support turns it back on');
select is(admin_prepare_password_reset('00000000-0000-0000-0000-0000000000a2', 'User asked by phone'), 'seller@example.com',
  'a reset goes to the address on file');
reset role;

select * from finish();
rollback;
