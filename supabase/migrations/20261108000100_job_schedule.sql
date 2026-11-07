-- Tender deadlines run every minute inside the database, so no secret is needed for them.
-- The web job runner (payments, email, expiry) runs every 15 minutes once its URL and secret are in the vault.
-- Test databases have no pg_cron, so the schedule is skipped there.
do $schedule$
begin
  if not exists (select from pg_available_extensions where name = 'pg_cron')
    or not exists (select from pg_available_extensions where name = 'pg_net') then
    return;
  end if;
  create extension if not exists pg_cron with schema pg_catalog;
  create extension if not exists pg_net with schema extensions;

  perform cron.schedule('tender-deadlines', '* * * * *', 'select public.tick_tenders()');
  perform cron.schedule('billing-jobs', '*/15 * * * *', $job$
    select net.http_post(
      url := runner.decrypted_secret,
      headers := jsonb_build_object('Authorization', 'Bearer ' || secret.decrypted_secret),
      timeout_milliseconds := 30000
    )
    from vault.decrypted_secrets runner, vault.decrypted_secrets secret
    where runner.name = 'job_runner_url' and secret.name = 'internal_job_secret';
  $job$);
end;
$schedule$;
