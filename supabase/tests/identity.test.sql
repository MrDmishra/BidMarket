begin;
select plan(25);

insert into auth.users (id, phone, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', '+919000000001', 'a@example.com', '{"role":"admin"}'),
  ('00000000-0000-0000-0000-00000000000b', '+919000000002', 'b@example.com', '{}'),
  ('00000000-0000-0000-0000-00000000000c', '+919000000003', 'c@example.com', '{}');

select is((select role::text from profiles where email = 'a@example.com'), 'org_user', 'sign-up metadata cannot grant admin');

insert into organisations (id, kind, entity_type, legal_name, pan_enc, pan_hmac) values
  ('10000000-0000-0000-0000-00000000000a', 'buyer', 'company', 'Org A', 'x', 'a'),
  ('10000000-0000-0000-0000-00000000000b', 'seller', 'company', 'Org B', 'y', 'b');
update profiles set org_id = '10000000-0000-0000-0000-00000000000a' where email = 'a@example.com';
update profiles set org_id = '10000000-0000-0000-0000-00000000000b' where email = 'b@example.com';
update profiles set role = 'admin' where email = 'c@example.com';

insert into bank_accounts (id, org_id, holder_name, account_no_enc, account_last4, ifsc, is_primary) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'Org A', 'enc', '1234', 'HDFC0001234', true),
  ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 'Org B', 'enc', '5678', 'HDFC0001234', true);
insert into org_addresses (id, org_id, label, line1, city, state_code, pincode, is_registered) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'Head office', '1 Road', 'Bhopal', '23', '462001', true);

select throws_ok($$insert into organisations (kind, entity_type, legal_name) values ('seller', 'individual', 'Person')$$, '23514', null, 'individuals cannot sell');
select throws_ok($$update organisations set status = 'active' where legal_name = 'Org B'$$, '23514', null, 'active sellers need a GSTIN');
select throws_ok($$insert into organisations (kind, entity_type, legal_name, gstin) values ('buyer', 'company', 'Bad', 'NOTAGSTIN')$$, '23514', null, 'GSTIN format is checked');
select throws_ok($$insert into organisations (kind, entity_type, legal_name, pan_hmac) values ('buyer', 'company', 'Copy', 'a')$$, '23505', null, 'one buyer organisation per PAN');
select throws_ok($$update org_addresses set city = 'Indore'$$, 'P0001', null, 'addresses cannot be edited');
select throws_ok($$delete from org_addresses$$, 'P0001', null, 'addresses cannot be deleted');
select throws_ok($$update bank_accounts set ifsc = 'SBIN0001234'$$, 'P0001', null, 'bank details cannot be edited');
select lives_ok($$update bank_accounts set is_primary = false where holder_name = 'Org B'$$, 'the primary flag can change');
select throws_ok($$insert into bank_accounts (org_id, holder_name, account_no_enc, account_last4, ifsc, is_primary) values ('10000000-0000-0000-0000-00000000000a', 'Org A', 'e', '1111', 'HDFC0001234', true)$$, '23505', null, 'one primary bank account');

insert into audit_log (action, entity_type, entity_id) values ('test', 'test', '1');
select throws_ok($$delete from audit_log$$, 'P0001', null, 'audit log is append-only');

set local role anon;
select is((
  select count(*) from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
    and c.relname in ('organisations', 'profiles', 'consents', 'org_addresses', 'bank_accounts',
      'verifications', 'turnover_declarations', 'otp_attempts', 'audit_log')
    and has_table_privilege('anon', c.oid, 'select')
), 0::bigint, 'visitors can read no identity table');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select is((select count(*) from organisations), 1::bigint, 'buyer sees only its organisation');
select is((select legal_name from organisations), 'Org A', 'buyer sees the right organisation');
select is((select count(*) from profiles), 1::bigint, 'user sees only own profile');
select is((select count(*) from bank_accounts), 1::bigint, 'buyer sees only own bank account');
select is((select count(*) from audit_log), 0::bigint, 'ordinary users cannot read the audit log');
select throws_ok($$select pan_enc from organisations$$, '42501', null, 'encrypted PAN is unreadable');
select throws_ok($$select pan_hmac from organisations$$, '42501', null, 'PAN hash is unreadable');
select throws_ok($$select account_no_enc from bank_accounts$$, '42501', null, 'encrypted bank number is unreadable');
select throws_ok($$update profiles set role = 'admin'$$, '42501', null, 'users cannot make themselves admin');
select throws_ok($$update organisations set status = 'active'$$, '42501', null, 'users cannot activate themselves');
select throws_ok($$insert into organisations (kind, entity_type, legal_name) values ('buyer', 'company', 'X')$$, '42501', null, 'users cannot write directly');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select is((select count(*) from audit_log), 0::bigint, 'admins without two-step login cannot read the audit log');
set local request.jwt.claims = '{"aal":"aal2"}';
select is((select count(*) from audit_log), 1::bigint, 'admins can read the audit log');
reset role;

select * from finish();
rollback;
