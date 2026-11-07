# 0011: Support and governance rules

**Date:** 8 November 2026
**Status:** Accepted, pending owner review

## Context

Phase 9 adds incidents, tickets, message threads, penalties and the admin tools. The PRD names these features but leaves several rules open.

## Decision

- An incident is about exactly one order, tender or product, and only a party to it can raise it. On an order, the other side is the other party. On a product, it is the seller. When a buyer raises one about a tender, no seller is named, so no seller identity is exposed (rule 7).
- Parties see each other only as "the other party". Message authors show as You, Your team, Other party or Bid Market support. Only support sees organisation names.
- Every admin write needs a reason of at least 3 characters. The database refuses it otherwise and stores the reason in the audit log. Opening an organisation's detail page is also logged.
- A reply from the user reopens a resolved ticket. A closed incident takes no more messages.
- Rejection strikes now create a penalty record. Waiving a strike lowers the strike count by one, so the next strike gets the shorter block. Lifting a block waives every penalty still running. A block by support is a penalty without a strike number, and a block with no day count is permanent.
- Support can pause a live or scheduled auction during a platform problem. A paused auction refuses bids (`AUCTION_PAUSED`), and the deadline job leaves it alone. On resume, the time lost is added back, and at least 5 minutes remain.
- The public contact form waits for Turnstile keys. Signed-in users use tickets.

## Consequences

- Support can settle disputes and fix mistakes without database access, and every change has a named reason.
- Buyers raising a tender complaint cannot point at a seller. Support sees the full tender.
