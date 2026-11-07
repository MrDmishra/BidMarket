# Launch checklist

Work through this list in order. Items marked **owner** need the owner's accounts, money or signature. The rest are already built.

## 1. Before the pilot

| Item | Who | State |
|---|---|---|
| Test payment in Razorpay test mode, end to end | owner | Waiting |
| Lawyer and CA answers on the adviser question list (D-10 legal entity, D-12 GST and TDS, D-15 retention) | owner | Waiting |
| Final terms, privacy, refund and cancellation pages from the lawyer | owner | Drafts are live |
| Trademark search for "Bid Market" | owner | Waiting |
| Supabase paid plan with daily backups, plus point-in-time recovery | owner | Waiting |
| One restore drill (`backup-restore.md`) | owner | Waiting |
| Uptime monitor on `/api/health` and `SENTRY_DSN` for error alerts (`monitoring.md`) | owner | Waiting |
| Resend: verify the sending domain, then add `RESEND_API_KEY` and `EMAIL_FROM` | owner | Waiting |
| MSG91: DLT registration and OTP template, then the three `MSG91_*` values | owner | Waiting |
| Cashfree: PAN, GSTIN and bank checks (D-4), then the `CASHFREE_*` values | owner | Waiting |
| Turnstile keys, for the public contact form and sign-up protection | owner | Waiting |
| A malware scanner for uploaded PDFs. Until then, support checks each document in Admin → Documents to check | owner to choose | Manual review built |

## 2. Switching to live

1. In Razorpay, finish KYC and switch to **Live Mode**. Create live keys and a live webhook for `https://<domain>/api/webhooks/razorpay`.
2. In Vercel (Production), replace `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` with the live values. Mark the secrets Sensitive.
3. In Admin → Fees and settings, save a new settings row with the legal name and `supplier_gstin`. Invoices show a test notice until then.
4. Set `APP_ENV` to `production` in Vercel. This:
   - lets search engines index the site
   - switches off seller test activation, in the app and the API
   - makes the app refuse to start if a core setting is missing
5. Connect the custom domain in Vercel and update `NEXT_PUBLIC_APP_URL` and the `job_runner_url` vault value to match.
6. Redeploy and check `/api/health` shows `status: ok` and `jobs: ok`.
7. Make one small real payment (for example the lowest direct order fee), check the invoice, then refund it if needed.

## 3. Pilot

- Start with a few known buyers and sellers in Rajasthan.
- Watch Admin → Overview daily for incidents, tickets and documents to check.
- Keep the first auctions short and schedule them when support is online, so a pause is possible.
