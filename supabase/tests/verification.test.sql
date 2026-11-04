begin;
select plan(23);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'buyer@example.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'other@example.com'),
  ('00000000-0000-0000-0000-0000000000a1', 'admin@example.com');
update profiles set role = 'admin' where email = 'admin@example.com';

create function pg_temp.act_as(p_id text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_id, true);
$$;

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
select create_organisation('buyer', 'company', 'Buyer Co', 'v1');

select throws_ok($$select submit_organisation()$$, 'P0001', 'VERIFICATION_FAILED', 'cannot submit empty details');
select throws_ok($$select save_business_identity('BAD', null)$$, 'P0001', 'VALIDATION_FAILED', 'PAN format is checked');
select throws_ok($$select save_business_identity('AABCB1234F', '23ZZZZZ9999Z1Z5')$$, 'P0001', 'VERIFICATION_FAILED', 'GSTIN must contain the PAN');
select lives_ok($$select save_business_identity('AABCB1234F', '23AABCB1234F1Z5')$$, 'saves PAN and GSTIN');
select is((select pan_last4 from organisations), '234F', 'keeps only the last four PAN characters readable');
select lives_ok($$select add_registered_address('1 Road', '', 'Bhopal', '23', '462001')$$, 'adds the address');
select throws_ok($$select add_registered_address('2 Road', '', 'Bhopal', '23', '462001')$$, 'P0001', 'INVALID_STATE', 'one registered address');
select throws_ok($$select add_bank_account('Buyer Co', '12', 'HDFC0001234')$$, 'P0001', 'VALIDATION_FAILED', 'account number format is checked');
select lives_ok($$select add_bank_account('Buyer Co', '123456789012', 'HDFC0001234')$$, 'adds the bank account');
select is((select account_last4 from bank_accounts), '9012', 'shows only the last four digits');
select is(submit_organisation()::text, 'pending_review', 'buyer goes to review');
select throws_ok($$select save_business_identity('AABCB1234G', null)$$, 'P0001', 'INVALID_STATE', 'details lock after submission');
select throws_ok($$select admin_pending_organisations()$$, 'P0001', 'FORBIDDEN', 'buyers cannot open the queue');
select throws_ok($$select admin_review_organisation(public.current_org_id(), true, 'self approval')$$, 'P0001', 'FORBIDDEN', 'buyers cannot approve themselves');
select throws_ok($$select private.secret('field_encryption_key')$$, '42501', null, 'users cannot read the keys');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select create_organisation('buyer', 'company', 'Other Co', 'v1');
select throws_ok($$select save_business_identity('AABCB1234F', null)$$, 'P0001', 'VERIFICATION_FAILED', 'a PAN can be used once per kind');
reset role;

select isnt((select pan_enc from organisations where legal_name = 'Buyer Co'), 'AABCB1234F'::bytea, 'PAN is stored encrypted');
select is(
  (select extensions.pgp_sym_decrypt(pan_enc, private.secret('field_encryption_key')) from organisations where legal_name = 'Buyer Co'),
  'AABCB1234F', 'PAN can be decrypted with the key');

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$select admin_pending_organisations()$$, 'P0001', 'FORBIDDEN', 'admins need two-step login');
select set_config('request.jwt.claims', '{"aal":"aal2"}', true);
select is((select count(*) from admin_pending_organisations()), 1::bigint, 'admin sees the queue');
select throws_ok($$select admin_review_organisation((select id from admin_pending_organisations()), true, '')$$, 'P0001', 'VALIDATION_FAILED', 'a reason is required');
select lives_ok($$select admin_review_organisation((select id from admin_pending_organisations()), true, 'Documents match')$$, 'admin approves');
reset role;

select is((select status::text from organisations where legal_name = 'Buyer Co'), 'active', 'organisation is active');

select * from finish();
rollback;
