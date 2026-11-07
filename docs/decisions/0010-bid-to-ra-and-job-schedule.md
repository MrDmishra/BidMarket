# 0010: Bid to RA rules and the job schedule

**Date:** 8 November 2026
**Status:** Accepted, pending owner review

## Context

F-42 says the buyer removes the highest bidder or the highest 50%, then an auction runs among the rest. It does not say what happens on ties, if the buyer does nothing, what the auction starts from, or who may join. Tender deadlines also need a schedule that does not wait for payment keys.

## Decision

- **Removing the highest bidder** removes every seller tied at the highest sealed price. **Removing the highest half** removes the highest `floor(n / 2)` sellers, with the later bid removed first on a tie.
- At least one seller must leave and one must stay. A choice that would remove nobody or everybody is refused.
- The buyer chooses by rank only. During shortlisting the buyer sees how many sealed bids arrived, never their prices. Prices stay hidden until the auction closes (rule 5).
- The auction must start at least 1 hour after sealed bidding ends and run at least 15 minutes. If sealed bidding is extended or the fee is paid late, the auction moves with it and keeps its length.
- **A missed shortlist** keeps every sealed bidder in, and the auction starts on time.
- The auction opens at the lowest sealed bid still in, so the first auction bid must beat it by the 0.5% decrement.
- Only sellers still in may bid. Removed sellers and new sellers cannot join, and the open tender lists hide the tender once sealed bidding ends.
- The minimum bid count applies to the sealed round only. The auction closes to evaluation even if fewer sellers remain.
- Removed sellers are left out of the results, the ranking and the award chain.
- Tender deadlines run every minute through pg_cron calling `tick_tenders` directly in the database. The web job runner (payment reconciliation, email, expiry) runs every 15 minutes and does nothing until `internal_job_secret` is in the vault.

## Consequences

- The buyer cannot pick individual sellers to remove, which keeps identities hidden and the rule simple.
- A buyer who forgets to shortlist still gets an auction, at the cost of more sellers in it.
- Deadlines no longer depend on the payment setup.
