# Bid Market: Implementation Plan

Follows PRD.md, DESIGN.md, ARCHITECTURE.md, DATABASE.md, API.md and AGENTS.md. No application code is included.

## Before Phase 1

These items are outside the code, and several have long lead times. Start them early.

| Item | Needed by |
|---|---|
| Decide D-6 (launch categories and region) and D-10 (brand and legal entity) | Phase 3 and any provider sign-up |
| Confirm D-1 to D-15 and A-1 to A-4 | Phase 0 |
| Register business, GST and bank account | Payment gateway activation |
| Apply for Razorpay and Cashfree accounts, with a marketplace use-case review | Phase 5 and Phase 2 production keys |
| Complete DLT registration, sender ID and templates | SMS in production |
| Instruct lawyer for terms and policies, and chartered accountant for GST and TDS | Phase 11 |

Sandbox accounts let development continue while live approvals are pending.

## Phase 0: Foundation

**Goal:** A runnable, deployable empty application.

- **Tasks:** Create repository, Next.js app, Tailwind tokens, fonts, linting, type check, CI, environment validation, Sentry, error handling, logger, health route, preview deployment.
- **Files:** `app/`, `lib/`, `components/ui/`, config, `.env.example`, `docs/`.
- **Prerequisites:** Hosting accounts.
- **Database/API:** Supabase project connected. `/api/health`.
- **Tests:** Smoke test, CI pipeline.
- **Done when:** A preview URL loads the design tokens in both themes and health passes.
- **Status:** Complete. The site is deployed on Vercel, and `/api/health` reports `ok` with Supabase connected.

## Phase 1: Design system and public shell

**Goal:** Shared components and static pages.

- **Tasks:** UI components from DESIGN.md section 5, public layout, navigation, 403 and 404, marketing pages with placeholder legal text clearly marked.
- **Files:** `components/ui/`, `app/(public)/`.
- **Prerequisites:** Phase 0.
- **Database/API:** None.
- **Tests:** Accessibility checks, phone-width screenshots.
- **Done when:** Every component shows all its states on an internal preview page.
- **Status:** Complete. Signed-in navigation moves to Phase 2, because it needs login and roles. The contact form moves to Phase 9.

## Phase 2: Accounts and authorization

**Goal:** Users can register and get verified. J1 and J5, up to payment.

- **Tasks:** Identity migrations, helper functions, RLS, Auth setup, OTP hook, Turnstile, onboarding flow, Cashfree adapter, encryption, consent capture, admin approval queue, admin MFA, audit log.
- **Files:** `modules/accounts/`, `modules/admin/`, `lib/auth/`, `lib/crypto/`, `lib/providers/`, `app/(auth)/`.
- **Prerequisites:** Phase 1. D-4 and D-5.
- **Database/API:** Section 3.1 tables, `audit_log`. API section 2.
- **Tests:** RLS tests, unverified-account blocks, OTP limits, provider failure leading to manual review.
- **Done when:** A buyer can be approved and a seller reaches the payment step, with admin routes protected by MFA.
- **Status:** In progress. Identity schema, row-level security and database tests are complete. Supabase is connected. Email sign-up, login, password reset, protected dashboards and the first onboarding step are built. Manual verification and the admin queue are built. Admin access now needs two-step login in both the app and database. Automatic PAN, GSTIN and bank checks, phone OTP and Turnstile remain.

## Phase 3: Files and catalogue

**Goal:** Sellers list products and buyers browse. J6 and J9.

- **Tasks:** File pipeline, category and specification admin, product form, status flow, category requests, public catalogue, search and filters.
- **Files:** `modules/catalogue/`, `lib/files/`, `app/(public)/products/`, seller and admin pages.
- **Prerequisites:** Phase 2. Launch categories from D-6 for production seed. Scanning vendor (A-2) by Phase 11 at the latest.
- **Database/API:** Tables 3.2 and `files`. API sections 3 and 4.
- **Tests:** Status transitions, upload validation, seller identity absent from public responses, search performance.
- **Done when:** A product moves from draft to public, and all status rules hold.

## Phase 4: Billing core

**Goal:** Any fee can be collected, recorded and invoiced.

- **Tasks:** Settings, charge calculation, Razorpay checkout, webhook, reconciliation, wallet, tax invoices, subscription, job runner and outbox.
- **Files:** `modules/billing/`, `lib/money/`, `lib/providers/`, `app/api/webhooks/`, `app/api/internal/`.
- **Prerequisites:** Phase 2. Razorpay test keys. D-2, D-3, D-12 and D-14.
- **Database/API:** Tables 3.5, `jobs`, `outbox`, `webhook_events`, `idempotency_keys`. API section 7.
- **Tests:** Fee and GST calculations, duplicate and out-of-order webhooks, amount mismatch, wallet balance, gapless invoice numbers.
- **Done when:** A seller can pay the subscription in test mode and go live, even if the browser closes mid-payment.

## Phase 5: Direct orders

**Goal:** J2 and J8 complete from start to finish.

- **Tasks:** Order quote, creation, acceptance, contact unlock, dispatch, receipt, payment terms, email notifications, document PDFs.
- **Files:** `modules/orders/`, `modules/documents/`, buyer and seller order pages.
- **Prerequisites:** Phases 3 and 4. D-1, D-11 and D-13.
- **Database/API:** Tables 3.4. API section 5.
- **Tests:** Limits, stock race, permission tests, fee movement, contact gating, document generation, end-to-end journey.
- **Done when:** One test order reaches Completed with a downloadable acceptance report, contract and tax invoices.

## Phase 6: Sealed bid tenders

**Goal:** Bid tenders work from publishing through award.

- **Tasks:** Regular and custom tender creation, publishing fee, eligibility, sealed bids, attempts, withdrawal, opening, evaluation, award, acceptance, deposit and balance, extensions and cancellation, `tick_tenders`.
- **Files:** `modules/tenders/`, buyer and seller tender pages.
- **Prerequisites:** Phase 5.
- **Database/API:** Tables 3.3. API section 6, excluding auction routes.
- **Tests:** Sealed visibility, attempt limit, deadline, extension rules, award chain, wallet release on cancellation.
- **Done when:** J3 and J7 work for a Bid tender, and late bids fail.

## Phase 7: Reverse auctions

**Goal:** Fair, correct live auctions.

- **Tasks:** `place_ra_bid`, decrement, anti-sniping, closing, L1 award chain, penalties, private channels, live auction screen, reconnection and polling, buyer view, admin pause and resume.
- **Files:** `modules/tenders/auction`, `app/(app)/seller/`, `app/(app)/buyer/`, migrations for Realtime policies.
- **Prerequisites:** Phase 6. D-7, D-8 and D-9.
- **Database/API:** Auction functions, Realtime policies. API auction routes.
- **Tests:** Parallel bids at the deadline, tie order, duplicate retries, late bid rejection, buyers receiving no prices, channel access, connection loss, load test.
- **Done when:** The concurrency test produces the correct winner on every run, and load targets pass.

## Phase 8: Bid to RA

**Goal:** The combined method works.

- **Tasks:** Shortlisting, elimination, scheduled transition, eligibility of remaining sellers.
- **Files:** `modules/tenders/`, buyer shortlist page.
- **Prerequisites:** Phase 7.
- **Database/API:** `shortlist` route, tender tick update.
- **Tests:** Elimination rules, excluded sellers denied, missed shortlist handling.
- **Done when:** A Bid to RA tender runs from sealed bids through to an order.

## Phase 9: Support and governance

**Goal:** J4 and J10.

- **Tasks:** Incidents, tickets, message threads, decisions, strike waiver, admin overview, audit search, dashboards with attention lists.
- **Files:** `modules/support/`, `modules/admin/`, dashboards.
- **Prerequisites:** Phases 5 to 8.
- **Database/API:** Table 3.6. API sections 8 and 9.
- **Tests:** Party-only access, required references, admin reason enforcement.
- **Done when:** Every admin action in the PRD is possible and logged.

## Phase 10: Hardening

**Goal:** Meet the non-functional requirements.

- **Tasks:** Rate limits, security headers, performance work, accessibility pass, loading and error state review, backups and restore test, monitoring and alerts.
- **Prerequisites:** Phases 1 to 9.
- **Database/API:** Index tuning only, driven by measurement.
- **Tests:** Full end-to-end suite, load tests, security audit, restore drill.
- **Done when:** PRD section 4 targets are measured and met.

## Phase 11: Launch readiness

**Goal:** Safe production launch.

- **Tasks:** Remove the `noindex` setting in the root layout, final legal pages, production keys, malware scanning, DLT templates live, production seed, deployment, a small paid transaction test, operations runbook, pilot with a small group.
- **Prerequisites:** All earlier phases, and external items above.
- **Tests:** Production smoke test, one real low-value payment and invoice check, final audit using the launch criteria in PRD section 12.
- **Done when:** Audit verdict is READY or READY WITH WARNINGS, with no blockers.

## Requirement coverage

| PRD area | Phase |
|---|---|
| Accounts F-1 to F-8 | 2 |
| Catalogue F-10 to F-16, F-19 | 3 |
| Direct orders F-20 to F-27 | 5 |
| Tenders F-29 to F-37, F-43 | 6 |
| Auctions F-38 to F-41, F-44 | 7 |
| Bid to RA F-42 | 8 |
| Billing F-46 to F-54 | 4 |
| Documents F-55 | 5 |
| Support F-56 to F-58, F-60, F-61 | 2 and 9 |
| Notifications F-59 | 4 onward |
| Marketing pages F-62 | 1 |

## Recommended first task

**Phase 0, Project Setup (prompt 8).** It has no business decisions in it apart from A-3 (hosting plans), and everything else depends on it.

Before starting, confirm your D-1 to D-15 and A-1 to A-4 decisions, because a change to D-1, D-2, D-4 or D-7 would change DATABASE.md.
