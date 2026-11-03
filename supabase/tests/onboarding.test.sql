begin;
select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000d', 'd@example.com'),
  ('00000000-0000-0000-0000-00000000000e', 'e@example.com');
update profiles set role = 'admin' where email = 'e@example.com';

select throws_ok($$select create_organisation('buyer', 'company', 'No User', 'v1')$$, 'P0001', 'UNAUTHENTICATED', 'needs a signed-in user');

set local role anon;
select throws_ok($$select create_organisation('buyer', 'company', 'Visitor', 'v1')$$, '42501', null, 'visitors cannot call it');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select throws_ok($$select create_organisation('seller', 'individual', 'Person', 'v1')$$, 'P0001', 'NOT_ELIGIBLE', 'individuals cannot sell');
select lives_ok($$select create_organisation('buyer', 'company', '  Org D  ', 'v1')$$, 'creates the organisation');
select is((select legal_name from organisations), 'Org D', 'trims the name and links the user');
select is((select status::text from organisations), 'draft', 'starts as draft');
select is((select policy_version from consents), 'v1', 'records consent');
select throws_ok($$select create_organisation('buyer', 'company', 'Second', 'v1')$$, 'P0001', 'INVALID_STATE', 'one organisation per user');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
select throws_ok($$select create_organisation('buyer', 'company', 'Admin Org', 'v1')$$, 'P0001', 'INVALID_STATE', 'admins cannot own organisations');
reset role;

select * from finish();
rollback;
