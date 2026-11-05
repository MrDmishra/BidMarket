# 0009: Auction updates and closing

**Date:** 6 November 2026
**Status:** Accepted, pending owner review

## Context

The architecture planned Supabase Realtime private channels. They need a dashboard setting and live testing that are not available yet. A wrong channel policy could expose prices.

## Decision

- Auction screens poll every 3 seconds through the same masked database functions. Realtime stays a later upgrade.
- At close, the auction goes to the buyer to award by rank, exactly as a sealed tender does, instead of awarding L1 automatically.
- An auction starts at least 1 hour after creation and runs at least 15 minutes. A late fee payment moves the whole auction, keeping its length.
- A seller must beat L1 by 0.5% on every bid, including a seller lowering their own rank.
- An anti-sniping extension adds 5 minutes to the deadline, 6 times at most.

## Consequences

- Sellers can see a price up to 3 seconds late. The server still decides every bid, and a late bid gets a clear refusal.
- Polling adds load: 500 sellers make about 170 requests a second. Phase 10 must measure this, and Realtime is the fix if it fails.
- A buyer could award someone other than L1, as in a sealed tender.
