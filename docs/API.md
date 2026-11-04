# Bid Market: API

Source of truth: PRD.md, ARCHITECTURE.md and DATABASE.md.

## 1. Conventions

- **Base path:** `/api/v1`. JSON over HTTPS.
- **Client:** the web app only. There is no public API in MVP.
- **Authentication:** Supabase session cookie. Roles below are enforced on the server.
- **IDs:** UUIDs in paths. Human numbers such as `tender_no` are display only.
- **Money:** integer paise fields ending in `Paise`. Never floats.
- **Rates:** basis points fields ending in `Bps`.
- **Dates:** ISO 8601 with offset.
- **Writes:** every POST, PATCH and DELETE requires an `Idempotency-Key` header and passes an Origin check.
- **Field names:** camelCase in JSON.

### Auth levels

| Label | Meaning |
|---|---|
| Public | No session needed |
| User | Any signed-in user |
| Buyer | Signed in to an active buyer organisation |
| Seller | Signed in to an active seller organisation |
| Party | Member of an organisation on the record |
| Admin | Admin with MFA session |
| Internal | Shared secret or signature, never a browser |

### Success response

```json
{ "data": { }, "meta": { "requestId": "req_123" } }
```

### List response

```json
{ "data": [ ], "meta": { "requestId": "req_123", "nextCursor": "abc", "hasMore": true } }
```

### Error response

```json
{
  "error": {
    "code": "BID_TOO_HIGH",
    "message": "Your bid must be at least ₹3.04 below L1.",
    "fields": { "unitPaise": "Enter ₹604.96 or less." },
    "details": { "l1Paise": 60800, "maxAllowedPaise": 60496 }
  },
  "meta": { "requestId": "req_123" }
}
```

### Status codes

| Status | Use |
|---|---|
| 200, 201 | Success |
| 202 | Accepted, pending a webhook or job |
| 400 | `VALIDATION_FAILED` |
| 401 | `UNAUTHENTICATED` |
| 403 | `FORBIDDEN`, `ACCOUNT_BLOCKED`, `ACCOUNT_NOT_ACTIVE` |
| 404 | `NOT_FOUND`. Also used when the caller may not know a record exists |
| 409 | `INVALID_STATE`, `IDEMPOTENCY_CONFLICT`, `AUCTION_CLOSED`, `BID_TOO_HIGH`, `ATTEMPTS_EXCEEDED` |
| 422 | `LIMIT_EXCEEDED`, `VERIFICATION_FAILED`, `NOT_ELIGIBLE` |
| 429 | `RATE_LIMITED`, with `Retry-After` |
| 502, 503 | `PROVIDER_UNAVAILABLE`, `SERVICE_UNAVAILABLE` |
| 500 | `INTERNAL_ERROR` with `requestId` only |

### Pagination and filtering

- Cursor pagination with `cursor` and `limit`. Default 20, maximum 50.
- Sort with an allow-listed `sort` value.
- Unknown filters return 400.

### Idempotency

The server stores the first response for each organisation and key for 24 hours. The same key with the same body returns the saved response. The same key with a different body returns `IDEMPOTENCY_CONFLICT`.

## 2. Accounts

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/onboarding/organisation` | User | Create organisation with kind, type and name |
| PATCH | `/onboarding/organisation` | User | Update draft details |
| POST | `/onboarding/pan` | User | Save business PAN and GSTIN for review |
| POST | `/onboarding/identity/start` | User | Start identity check, returns provider URL |
| POST | `/onboarding/submit` | User | Submit for review, or move seller to payment |
| GET | `/me` | User | Current user, organisation, status and blocks |
| PATCH | `/me` | User | Update name, designation, theme |
| POST | `/organisation/addresses` | User | Add address. Immutable after |
| POST | `/organisation/bank-accounts` | User | Add and verify bank account |
| POST | `/organisation/bank-accounts/{id}/primary` | User | Set primary |
| POST | `/organisation/turnover` | Seller or onboarding | Declare 3 years of turnover |
| PATCH | `/organisation/maintenance` | Seller | Turn maintenance on or off |
| DELETE | `/organisation` | User | Delete if eligible under F-61 |

Sign-up, log-in, log-out, OTP and password reset use Supabase Auth through server actions in `modules/accounts`. Email and password work now. Turnstile and phone OTP follow when their accounts exist. Session helpers stay out of `/api/v1`.

**Example:** `POST /onboarding/pan`

Request: `{ "pan": "AAAAA0000A", "nameOnPan": "Example Traders Pvt Ltd" }`

Response: `{ "data": { "status": "verified", "panLast4": "000A", "legalName": "Example Traders Pvt Ltd" } }`

When the provider is unavailable, it returns 202 with `status: "manual_review"`.

## 3. Catalogue

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/categories` | Public | Category tree |
| GET | `/categories/{id}/specs` | Public | Specification template |
| GET | `/products` | Public | Filter by `q`, `category`, `state`, `spec.*`, `minPrice`, `maxPrice`, sort |
| GET | `/products/{id}` | Public | Product detail, without seller identity |
| GET | `/seller/products` | Seller | Own products |
| POST | `/seller/products` | Seller | Create draft |
| PATCH | `/seller/products/{id}` | Seller | Edit where status allows |
| POST | `/seller/products/{id}/submit` | Seller | Draft or notify to pending |
| POST | `/seller/products/{id}/publish` | Seller | Republish an unpublished product |
| POST | `/seller/products/{id}/unpublish` | Seller | Hide |
| PATCH | `/seller/products/{id}/commercials` | Seller | Change price, discount, stock |
| DELETE | `/seller/products/{id}` | Seller | Delete if stock is zero and nothing is active |
| POST | `/seller/category-requests` | Seller | Request category |

The submit, publish and unpublish routes share one handler. `seller_products` and `admin_pending_products` are read through Postgres functions.

## 4. Files

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/files` | User | Validate type and size, return signed upload URL |
| POST | `/files/{id}/complete` | User | Confirm upload and queue scanning |
| GET | `/files/{id}/url` | Party | Get a signed link valid for 5 minutes |

Limits: images up to 5 MB (JPEG, PNG, WebP), documents up to 10 MB (PDF), video up to 50 MB (MP4). Limits are proposals.

## 5. Direct orders

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/orders/quote` | Buyer | Calculate value, fee and tax. No record created |
| POST | `/orders` | Buyer | Create unpaid order and return payment details |
| GET | `/orders` | User | Own orders, filter by status |
| GET | `/orders/{id}` | Party | Order detail |
| GET | `/orders/{id}/contacts` | Party | Contact details after unlock, otherwise 403 |
| POST | `/orders/{id}/accept` | Seller | Create seller fee and payment details |
| POST | `/orders/{id}/reject` | Seller | Reject with reason |
| POST | `/orders/{id}/dispatch` | Seller | Attach documents, mark dispatched |
| POST | `/orders/{id}/receive` | Buyer | Attach proof, confirm receipt |
| GET | `/orders/{id}/documents` | Party | List generated documents |

**Example:** `POST /orders`

```json
{
  "productId": "uuid",
  "quantity": "20",
  "expectedDeliveryOn": "2026-11-15",
  "consigneeName": "Plant Stores",
  "consigneeGstin": "23AABCN1234F1Z5",
  "deliveryAddressId": "uuid",
  "paymentTerms": "credit",
  "creditDays": 30
}
```

The server computes all amounts. Any price or fee sent by the client is rejected as an unknown field.

## 6. Tenders and bids

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/tenders` | Public | Open tenders, public fields only |
| GET | `/tenders/{id}` | Public | Public detail. Returns more for the owner or participants |
| GET | `/buyer/tenders` | Buyer | Own tenders |
| POST | `/buyer/tenders` | Buyer | Create draft |
| PATCH | `/buyer/tenders/{id}` | Buyer | Edit draft |
| POST | `/buyer/tenders/{id}/publish` | Buyer | Validate and return payment details |
| GET | `/buyer/tenders/{id}/bids` | Buyer | Bids after opening or closure, otherwise 403 |
| POST | `/buyer/tenders/{id}/award` | Buyer | Select a seller in a bid tender |
| POST | `/buyer/tenders/{id}/shortlist` | Buyer | Remove `highest` or `highest50` in Bid to RA |
| GET | `/seller/tenders` | Seller | `view=eligible`, `applied`, `won` |
| POST | `/seller/tenders/{id}/join` | Seller | Check eligibility and create participant row |
| POST | `/seller/tenders/{id}/bids` | Seller | Submit or replace a sealed bid |
| DELETE | `/seller/tenders/{id}/bids/current` | Seller | Withdraw sealed bid |
| GET | `/seller/tenders/{id}/auction` | Seller | Current L1, own bid, rank, deadline, `seq` |
| POST | `/seller/tenders/{id}/auction/bids` | Seller | Place an auction bid |
| GET | `/buyer/tenders/{id}/auction` | Buyer | Bid count and deadline only while live |
| POST | `/seller/tenders/{id}/award/accept` | Seller | Accept and return fee payment details |
| POST | `/seller/tenders/{id}/award/reject` | Seller | Reject, apply penalty and pass to next seller |

**Example:** `POST /seller/tenders/{id}/auction/bids`

Request: `{ "unitPaise": 60300 }`

Response:

```json
{
  "data": {
    "bidId": "uuid",
    "unitPaise": 60300,
    "rank": 1,
    "l1Paise": 60300,
    "endsAt": "2026-11-04T12:30:00+05:30",
    "seq": 41
  }
}
```

**Auction rules**

- Rank appears only for the caller.
- Competitor identity is never returned to sellers during an auction.
- A 2xx response is the only proof that a bid was accepted.
- When the client times out, it retries with the same `Idempotency-Key`.

**Real-time.** ARCHITECTURE.md section 7 defines the two private channels and payloads. Clients must treat broadcasts as refresh hints.

## 7. Billing

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/payments/{chargeId}/checkout` | Party | Apply wallet balance, then create Razorpay order for the rest |
| GET | `/payments/{chargeId}` | Party | Payment and charge status |
| POST | `/payments/{chargeId}/client-confirm` | Party | Show progress only. Never marks a payment as paid |
| GET | `/wallet` | User | Available, on hold and paid totals |
| GET | `/wallet/entries` | User | Ledger |
| GET | `/invoices` | User | Tax invoices |
| GET | `/subscription` | Seller | Current subscription |
| POST | `/subscription/quote` | Seller or onboarding | Calculate fee from turnover |
| POST | `/subscription/renew` | Seller | Create renewal charge |
| GET | `/fees/public` | Public | Current fee table for the Fees page |

## 8. Support

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET, POST | `/incidents` | User | List own, or raise one with a reference |
| GET | `/incidents/{id}` | Party | Detail and messages |
| POST | `/incidents/{id}/messages` | Party | Add message |
| GET, POST | `/tickets` | User | List own, or raise one |
| GET | `/tickets/{id}` | User | Detail and messages |
| POST | `/tickets/{id}/messages` | User | Add message |
| POST | `/contact` | Public | Visitor message, with Turnstile |

## 9. Admin

All routes require Admin with MFA. Every write requires a `reason` and is audit logged.

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/overview` | Queue counts and key figures |
| GET | `/admin/organisations` | Search and filter |
| GET | `/admin/organisations/{id}` | Detail. Identity reads are logged |
| POST | `/admin/organisations/{id}/review` | Approve or reject, with a reason |
| POST | `/admin/organisations/{id}/test-activate` | Temporary. Activates a seller without payment for testing. Remove before launch |
| POST | `/admin/organisations/{id}/suspend` | Suspend |
| POST | `/admin/organisations/{id}/reinstate` | Reinstate |
| POST | `/admin/organisations/{id}/block` | Apply block |
| POST | `/admin/organisations/{id}/lift-block` | Lift block |
| POST | `/admin/penalties/{id}/waive` | Waive a strike |
| GET | `/admin/products?status=pending` | Queue |
| POST | `/admin/products/{id}/review` | `approve`, `notify`, `reject` |
| GET, POST | `/admin/categories` | List, create |
| PATCH | `/admin/categories/{id}` | Update |
| GET, POST | `/admin/categories/{id}/specs` | List, create |
| PATCH | `/admin/specs/{id}` | Update |
| GET | `/admin/category-requests` | Queue |
| POST | `/admin/category-requests/{id}/review` | Approve or reject |
| GET | `/admin/tenders` | All tenders |
| POST | `/admin/tenders/{id}/pause` | Pause an auction during a platform incident |
| POST | `/admin/tenders/{id}/resume` | Resume, with extended deadline |
| POST | `/admin/tenders/{id}/cancel` | Cancel |
| GET | `/admin/orders` | All orders |
| GET | `/admin/incidents` | Queue |
| POST | `/admin/incidents/{id}/decide` | Record decision |
| GET | `/admin/tickets` | Queue |
| POST | `/admin/tickets/{id}/resolve` | Resolve |
| GET | `/admin/settings` | Current and past settings |
| POST | `/admin/settings` | Create a new settings row |
| GET | `/admin/audit-log` | Search |

## 10. Webhooks and internal routes

### Razorpay: `POST /api/webhooks/razorpay`

1. Read the raw body before any JSON parsing.
2. Compute HMAC SHA256 with `RAZORPAY_WEBHOOK_SECRET`, and compare against `X-Razorpay-Signature` in constant time.
3. Reject with 400 on mismatch.
4. Insert `x-razorpay-event-id` into `webhook_events`. If it already exists, return 200 and stop.
5. Apply the state change in a transaction, then return 200 quickly.

**Rules**

- Duplicates and out-of-order delivery are normal. Handlers must tolerate both. Check current state before applying a change.
- During a secret rotation, accept the old secret for retried older events.
- Check the amount and charge match before marking a charge paid.
- A reconciliation job compares unresolved payments against Razorpay every 15 minutes.

Subscribed events: `payment.captured`, `payment.failed`, `order.paid`.

### Other inbound routes

| Path | Protection | Purpose |
|---|---|---|
| `/api/webhooks/cashfree` | Provider signature | Verification and identity results |
| `/api/hooks/send-sms` | Supabase hook signature | Enforce OTP limits, send via MSG91 |
| `/api/internal/jobs/run` | `INTERNAL_JOB_SECRET` bearer | Process jobs and outbox |
| `/api/health` | Public, no sensitive data | App and Supabase health. Returns 503 when Supabase is unreachable |

## 11. External integrations

| Service | Operations | On failure |
|---|---|---|
| Razorpay | Create order, fetch payment | Keep charge pending, allow retry, reconcile |
| Cashfree | PAN, GSTIN, GSTIN by PAN, bank, CIN, identity flow | Move to manual review. Confirm the exact identity and DigiLocker route in Phase 2 |
| MSG91 | OTP and notification SMS | OTP shows retry. Others retry through outbox |
| Resend | Transactional email | Retry through outbox with backoff |
| Turnstile | Verify token on the server | Fail closed on login and signup. Show a clear retry message |
| Sentry | Errors | Must never affect a request |

**SMS.** TRAI DLT registration of entity, sender ID and templates is needed before Indian SMS delivery. Allow lead time before launch.

## 12. Rate limits

Limits are per user unless noted, and use a Postgres-backed counter. Values are proposals to tune during load testing.

| Scope | Limit |
|---|---|
| Sign-up, login, password reset | 5 per 15 minutes per IP and phone |
| OTP | 3 resends in 24 hours |
| Verification calls | 10 per hour per organisation |
| File upload | 30 per hour |
| Public search | 60 per minute per IP |
| Auction bids | 2 per second, 60 per minute per seller per tender |
| Sealed bids | 10 per minute |
| Other writes | 60 per minute |
| Other reads | 300 per minute |

## 13. Environment variables

Never commit real values. `NEXT_PUBLIC_` values are visible to browsers.

| Variable | Scope | Purpose |
|---|---|---|
| `APP_ENV` | Server | `local`, `preview` or `production`. Production requires core values at startup |
| `NEXT_PUBLIC_APP_URL` | Public | Site URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Client key. RLS protects access |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public | Captcha widget |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Public | Checkout |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Webhooks and jobs only |
| `SUPABASE_DB_URL` | CI only | Migrations |
| `SUPABASE_SEND_SMS_HOOK_SECRET` | Server | Hook verification |
| `RAZORPAY_KEY_SECRET` | Server | Razorpay API |
| `RAZORPAY_WEBHOOK_SECRET` | Server | Webhook signature |
| `CASHFREE_CLIENT_ID`, `CASHFREE_CLIENT_SECRET` | Server | Verification API |
| `CASHFREE_WEBHOOK_SECRET` | Server | Webhook signature |
| `MSG91_AUTH_KEY`, `MSG91_SENDER_ID` | Server | SMS |
| `MSG91_OTP_TEMPLATE_ID` | Server | DLT template |
| `RESEND_API_KEY`, `EMAIL_FROM` | Server | Email |
| `TURNSTILE_SECRET_KEY` | Server | Captcha |
| `INTERNAL_JOB_SECRET` | Server | Job runner |
| `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | Server or CI | Error tracking |
| `MALWARE_SCAN_*` | Server | Set after A-2 |

## 14. Data privacy and failure handling

- Return the minimum data needed for the caller's role.
- Mask PAN, bank numbers and phone numbers in lists.
- Never put personal data in URLs, logs or Sentry.
- Send providers only the data needed for that check.
- Record consent at each collection point.
- A payment may succeed while the server times out. Status always comes from webhooks or reconciliation, never from the browser callback.
- Provider failures during an auction must not stop bidding, because bids depend only on the database.
- When Postgres is unavailable, bids fail with 503. Admins may pause the auction and extend its deadline after recovery.
