# 0005: Owner decisions of 4 November 2026

**Date:** 4 November 2026
**Status:** Accepted

## Context

The PRD and architecture carried recommended defaults that needed owner approval, and some build-time choices had been made without separate approval.

## Decision

The owner accepted all recommendations put forward on this date:

- Public, re-encoded product images (decision 0004), and the live sub-category updates.
- The temporary seller test activation stays until Phase 11.
- Encryption keys stay in Vault (decision 0003).
- Work continues directly on `main`, with a branch only when code must wait for a database change.
- The public product list uses page numbers.
- PRD D-1, D-2, D-3, D-4, D-5, D-7, D-8, D-9, D-11, D-13 and D-14, as recommended.

## Consequences

- F-45 is removed, because D-7 skips the overnight visibility rule.
- D-3 still needs a choice between waiver and discount. D-4 still needs a named provider.
- D-10, D-12, D-15 and A-1 to A-4 stay open. PRD section 14 and ARCHITECTURE.md section 15 track them.
