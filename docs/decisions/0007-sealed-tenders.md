# 0007: Sealed bid tender rules

**Date:** 4 November 2026
**Status:** Accepted, pending owner review

## Context

The PRD leaves some tender details open. Phase 6 needs working rules.

## Decision

- The buyer fee is charged on the estimate. The seller fee is charged on the awarded value.
- A custom tender pays the fixed deposit to publish, and the rest of the fee after selection, before the seller is offered the award.
- The buyer awards by rank, and sellers stay anonymous until one accepts and pays.
- The strike ladder is applied now, because it is part of rejecting an award. An award that simply expires passes to the next seller with no strike.
- Consignee GSTIN is checked for format only until a GST provider is connected.
- An unpaid tender cancels after three days.

## Consequences

- A seller could let an award expire to avoid a strike. Review this after the pilot.
- If a buyer never awards, or never pays a custom balance, the tender waits. Phase 9 admin tools need to cover this.
- Consignee GSTIN checks do not yet meet F-32 in full.
