# Monitoring and alerts

## What to watch

`GET https://bid-market-zeta.vercel.app/api/health` returns:

| Field | Meaning | Action when wrong |
|---|---|---|
| `status` | `ok`, or `degraded` with HTTP 503 | Check the fields below |
| `supabase` | The database answers | Check the Supabase status page and project logs |
| `jobs` | `ok` when the minute deadline job ran in the last 5 minutes. `stale` means tenders and auctions are not closing | See "Jobs stopped" |
| `outbox` | `backlog` when an email has waited over 30 minutes. It does not fail the check | Check `RESEND_API_KEY` and `EMAIL_FROM` in Vercel |

## Set up an uptime alert (owner, once)

1. Create a free monitor with an uptime service, for example Better Stack or UptimeRobot.
2. Monitor `https://bid-market-zeta.vercel.app/api/health` every 1 to 3 minutes. Alert when the status is not 200.
3. Send alerts to the owner's phone and email.

## Error alerts

Add `SENTRY_DSN` in Vercel (Production) to send server errors to Sentry. The app already reports them when the value exists. Set a Sentry alert for new issues.

## Jobs stopped

In the Supabase SQL editor:

```sql
select jobname, schedule, active from cron.job;
select j.jobname, d.status, d.return_message, d.start_time
from cron.job_run_details d join cron.job j using (jobid)
order by d.start_time desc limit 20;
```

- `tender-deadlines` runs every minute and needs no secrets.
- `billing-jobs` runs every 15 minutes. A 401 in `net._http_response` means `INTERNAL_JOB_SECRET` in Vercel differs from `internal_job_secret` in the vault.
- `trim-job-history` deletes run history older than 7 days each night.

Bids never depend on these jobs. The bid functions check the clock themselves, so a stopped job delays closing but never admits a late bid.

## Platform problem during a live auction

1. Admin → Tenders → Pause auction, with the reason. Bids stop and the clock stops.
2. Fix the problem.
3. Resume. The lost time is added back, and at least 5 minutes remain.

## Rate limits

- Every signed-in write is limited to 60 a minute per user, in the database.
- Supabase limits sign-in, sign-up and password reset attempts.
- Before launch, consider a Vercel Firewall rate-limit rule on `/api/*` by IP. That is a provider setting, so it needs owner approval.
