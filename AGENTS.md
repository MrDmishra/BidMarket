# AGENTS.md: Rules for Coding Agents

These rules apply to every change in this repository.

## 1. Project documents

Read the relevant documents before changing code:

| Question | Document |
|---|---|
| What are we building? | `docs/PRD.md` |
| How should it look and behave? | `docs/DESIGN.md` |
| How is it structured? | `docs/ARCHITECTURE.md` |
| What is the data model? | `docs/DATABASE.md` |
| What does the API look like? | `docs/API.md` |

**Priority when they conflict:** user's latest instruction, then PRD, then the specialist document for that topic. Report any conflict before you continue.

Never silently change a requirement. If an unresolved PRD or architecture decision blocks your task, stop and ask.

## 2. Before you change anything

1. Inspect the existing code in the area you are changing.
2. Find and reuse existing patterns, components and utilities.
3. Identify the smallest change that completes the task.
4. Check which tests cover this area.

Make only the requested change. Do not rewrite working code, reformat unrelated files or refactor while fixing a bug. List unrelated problems in your report.

## 3. The prototype

`bid-market.html` is a reference for flows and appearance only. Do not copy its code or its browser-side business logic into the product.

## 4. Non-negotiable product rules

1. The server decides every fee, price, deadline, eligibility and role. Never trust client values.
2. Bid acceptance uses database server time inside the transaction.
3. Every state change that affects money, bids, orders or status runs inside one Postgres function.
4. A browser callback never marks a payment as paid. Only a verified webhook or reconciliation can.
5. Buyers never receive auction prices while an auction is live.
6. Sealed bids are hidden from everyone except their bidder until opening.
7. Competitor identity is never sent to sellers during a tender.
8. Contact details stay hidden until the fee conditions are met.
9. Bids, wallet entries, invoices, order events and audit logs are append-only.
10. Store money as integer paise and rates as basis points. Never use floating-point numbers for money.

## 5. Code quality and naming

- Write clear code before clever code. Prefer small functions with one job.
- Names describe domain meaning: `sellerOrgId`, `unitPaise`, not `id2` or `amt`.
- Files: `kebab-case`. Components: `PascalCase`. Functions and variables: `camelCase`. Constants: `SCREAMING_SNAKE_CASE`. Database: `snake_case`.
- Use PRD language in code: tender, bid, seller, consignee, L1.
- Remove dead code and debug logging before finishing.
- Comments explain why, not what.

## 6. Folder structure

- Follow ARCHITECTURE.md section 5.
- Business logic belongs in `modules/<area>`.
- A module may import another module only through its public `index.ts`.
- Route handlers stay thin: authenticate, validate, call service, return.
- Provider SDKs may be imported only inside `lib/providers`.

## 7. Components and design

- Check `components/ui` before creating a component.
- Use design tokens only. No raw colors, ad hoc spacing or new fonts.
- Build all states: loading, empty, success, error, and no access.
- Support light theme, dark theme, 360 px width, keyboard use and reduced motion.
- Follow DESIGN.md writing rules for all interface text.

## 8. Dependencies

- Do not add a package when the platform or an existing dependency can do the job.
- Before adding one, state what it does, why it is needed, and check its maintenance and security status.
- Pin versions through the lockfile. Do not upgrade unrelated packages.

## 9. Type safety

- TypeScript strict mode stays on.
- Do not use `any`. Use `unknown`, then narrow it.
- Do not use `@ts-ignore`. If `@ts-expect-error` is truly needed, include the reason.
- Validate all external input with Zod: requests, webhooks, provider responses, environment variables.
- Use generated database types.

## 10. Error handling

- Use the shared `AppError` and the error codes in API.md.
- Never swallow an error. Handle it, or let it reach the central handler.
- Users get a safe message that tells them what to do next.
- Set timeouts on every external call.
- Retry only idempotent operations.

## 11. Security and secrets

- Never commit secrets, real keys, customer data or production dumps. `.env*` stays ignored, except `.env.example`.
- Only approved values may use the `NEXT_PUBLIC_` prefix.
- The `service_role` key may be used only in webhooks, jobs and auth hooks.
- Never log secrets, passwords, OTPs, tokens, full PAN, bank numbers or documents.
- Never store Aadhaar numbers or images.
- Verify webhook signatures on the raw body before processing.
- Treat all uploads as untrusted. Validate type by content, and use private storage.
- Stop and flag any change that weakens authentication, authorization, RLS or validation.

## 12. Database and API access

- Change the schema only through a new migration. Never edit an applied migration.
- A schema change must match DATABASE.md. Update that document in the same change, and flag it for approval.
- Every new table has RLS enabled, with policies and pgTAP tests.
- Authenticated clients do not write directly to business tables.
- Every `SECURITY DEFINER` function sets `search_path` and checks the caller.
- Use parameterised queries. Never build SQL from strings.
- New endpoints must follow API.md conventions. Update that document in the same change.
- Avoid N+1 queries. Paginate lists.
- Keep transactions short, with no external API calls inside them.

## 13. Testing

- New behaviour needs tests. Bug fixes need a test that failed before the fix.
- Money, fees, tax, permissions and state transitions need unit or database tests.
- Auction changes must pass concurrency tests.
- Critical journeys need end-to-end coverage.
- Never remove, skip or weaken a test to get a pass. Investigate the cause.
- Before reporting done, run: lint, type check, unit and integration tests, and relevant end-to-end tests.

If a command cannot run, say so. Never report tests you did not run.

## 14. Documentation

- Keep project documents in step with behaviour in the same change.
- Update `.env.example` for every new variable, with no real values.
- Record significant technical decisions in `docs/decisions/`, with date, context, decision and consequences.

## 15. Git and change discipline

- Never work directly on `main`.
- Branch names: `feat/`, `fix/`, `chore/`, `docs/`.
- Keep commits small, with Conventional Commit messages.
- One task per pull request. Include what changed, why, how it was tested, and any risks.
- Do not force-push shared branches.
- Do not deploy, run production migrations, change production data or rotate secrets without explicit approval.
- Do not touch live payment or provider settings without explicit approval.

## 16. Reporting

Finish each task with:

- What changed, and the files affected
- Tests run, with results
- Remaining issues or risks
- Decisions that need approval
