# 0012: Hardening choices

**Date:** 8 November 2026
**Status:** Accepted, pending owner review

## Context

Phase 10 covers security headers, monitoring, loading states, accessibility and limits. Some PRD targets need measurements this project cannot run yet.

## Decision

- Every page sends a Content Security Policy, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, a strict referrer policy and a permissions policy. Scripts allow `'unsafe-inline'`, because Next.js hydration and the theme script are inline. A nonce policy would make every page dynamic. Scripts, frames and API calls are limited to this site, Supabase, Razorpay and Sentry.
- The health endpoint adds `jobs` and `outbox`. A stopped deadline job fails the check. An email backlog is reported but does not, so a missing email key cannot cause false alarms. Only states are public, never counts.
- Job run history is trimmed after 7 days.
- Signed-in writes keep the existing limit of 60 a minute per user. An IP rate limit at the edge waits for owner approval of a Vercel Firewall rule.
- Every signed-in page has a loading state. The new form component is in the accessibility scan, in light and dark.

## Consequences

- An injected inline script would not be blocked. Output is escaped by React and no page renders raw HTML, which limits that risk.
- These targets stay unmeasured until there is real traffic or a test account: catalogue load time on 4G, L1 delivery within 2 seconds at the 95th percentile, and 500 connected sellers.
