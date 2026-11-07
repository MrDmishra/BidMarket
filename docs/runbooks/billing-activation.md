# Billing activation

Billing code and tables are live. Payments stay off until these values exist. Enter secrets only in the Vercel and Razorpay dashboards, never in chat or in the repository.

## 1. Razorpay test mode

1. In Razorpay, switch to Test Mode and create API keys.
2. In Vercel, add `NEXT_PUBLIC_RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
3. In Razorpay, add a webhook for `https://<site>/api/webhooks/razorpay` with a secret of your choice. Subscribe to `payment.captured`, `payment.failed` and `order.paid`.
4. In Vercel, add that secret as `RAZORPAY_WEBHOOK_SECRET`.

## 2. Server access

1. In Supabase, copy the secret key. In Vercel, add it as `SUPABASE_SERVICE_ROLE_KEY`, for Production only.
2. Create a long random value. In Vercel, add it as `INTERNAL_JOB_SECRET`.
3. Redeploy.

## 3. Job schedule

The schedule is already set up (decision 0010). `tender-deadlines` runs every minute and needs nothing more. `billing-jobs` runs every 15 minutes and starts working once the job secret is in the vault. Run this once in the Supabase SQL editor, using the same value as `INTERNAL_JOB_SECRET` in Vercel:

```sql
select vault.create_secret('<same INTERNAL_JOB_SECRET value>', 'internal_job_secret');
```

To check the jobs: `select jobname, schedule, active from cron.job;`. To see recent runs: `select * from cron.job_run_details order by start_time desc limit 10;`.

## 4. Email

Add `RESEND_API_KEY` and `EMAIL_FROM` in Vercel. Until then, messages wait in the outbox.

## 5. Before live payments

- Set `supplier_gstin` and the legal name through a new settings row, once D-10 is decided. Invoices show a test notice until a GSTIN is set.
- Have the chartered accountant confirm GST and TDS (D-12).
- The D-3 launch offer is already set: 50% off for the first 100 sellers. Change it in Admin, under Fees and settings.
