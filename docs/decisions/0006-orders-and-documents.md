# 0006: Order documents and unscanned files

**Date:** 4 November 2026
**Status:** Accepted by the owner on 6 November 2026

## Context

Phase 5 needs PDF documents and dispatch uploads. No malware scanner is chosen yet (A-2), and the owner moved Razorpay setup to after Phase 5.

## Decision

- PDFs are built on request with pdfkit from frozen order records, so no file store or PDF job is needed. pdfkit is MIT licensed and actively maintained.
- Images are re-encoded and shared at once. Uploaded PDFs stay hidden from the other party until a scanner marks them clean.
- Tax invoices for order fees are issued when the order completes, because the fee is held until then.
- A buyer can cancel until the seller's fee is paid. Unpaid orders cancel after a day and return their stock.

## Consequences

- Until A-2 is closed, buyers cannot open bills that sellers upload as PDFs. Sellers can upload bills as images instead.
- Invoice timing needs confirmation from the chartered accountant (D-12).
- Orders cannot move past `unpaid` on the live site until Razorpay is connected.
