# 0013: Launch switches and manual document review

**Date:** 8 November 2026
**Status:** Accepted, pending owner review

## Context

Phase 11 asks to remove seller test activation and the `noindex` setting at launch. The owner is about to test, so removing them now would block testing. Uploaded PDFs also stay hidden from the other party until a scan marks them clean, and no scanner is connected.

## Decision

- `APP_ENV=production` is the launch switch. With it, the site is indexed and seller test activation is refused by the API and hidden in Admin. Previews stay unindexed and keep test activation.
- Until a scanner is chosen, support opens each pending document from Admin → Documents to check and marks it clean or unsafe, with a reason in the audit log. Only clean documents reach the other party.
- `docs/runbooks/launch.md` lists every owner step in order.

## Consequences

- Launching needs no code change, only the steps in the launch runbook.
- Manual review adds work for support and delays document access. It does not scale past a small pilot, so a scanner should be connected before wider launch.
- The database function for test activation stays until a later migration drops it after launch.
