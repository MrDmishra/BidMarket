-- Monitoring: the health endpoint reports whether the deadline job runs and whether email is backing up.
-- It returns states only, never counts or record details, because the endpoint is public.
create function public.system_health() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_last_run timestamptz;
  v_jobs text;
begin
  if to_regclass('cron.job_run_details') is null then
    v_jobs := 'not_scheduled';
  else
    execute $query$
      select max(d.end_time) from cron.job_run_details d join cron.job j on j.jobid = d.jobid
      where j.jobname = 'tender-deadlines' and d.status = 'succeeded'
    $query$ into v_last_run;
    v_jobs := case
      when v_last_run is null then 'not_scheduled'
      when v_last_run > now() - interval '5 minutes' then 'ok'
      else 'stale' end;
  end if;
  return jsonb_build_object(
    'jobs', v_jobs,
    'outbox', case when exists (
      select from public.outbox where status = 'pending' and next_attempt_at < now() - interval '30 minutes'
    ) then 'backlog' else 'ok' end
  );
end;
$$;
revoke all on function public.system_health from public;
grant execute on function public.system_health to anon, authenticated;

-- The deadline job runs every minute, so its run history is trimmed to a week.
do $cleanup$
begin
  if to_regclass('cron.job_run_details') is null then
    return;
  end if;
  perform cron.schedule('trim-job-history', '17 3 * * *',
    $job$delete from cron.job_run_details where end_time < now() - interval '7 days'$job$);
end;
$cleanup$;
