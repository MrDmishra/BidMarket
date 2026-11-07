begin;
select plan(3);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000f1', 'health@example.com');

set local role anon;
select is(system_health() ->> 'jobs', 'not_scheduled', 'a database without pg_cron reports no schedule');
select is(system_health() ->> 'outbox', 'ok', 'an empty outbox is fine');
reset role;

insert into outbox (template, recipient_user_id, dedupe_key, next_attempt_at)
values ('support_update', '00000000-0000-0000-0000-0000000000f1', 'health-test', now() - interval '1 hour');
set local role anon;
select is(system_health() ->> 'outbox', 'backlog', 'old unsent email is reported, without details');
reset role;

select * from finish();
rollback;
