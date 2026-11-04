# 0004: Product image handling

**Date:** 4 November 2026
**Status:** Accepted

## Context

Sellers must upload three images per product. PRD section 8 calls for private storage and malware scanning, but product images must display to the public, and no scanning vendor is chosen.

## Decision

The server decodes each upload with sharp, re-encodes it to WebP at no more than 1600 pixels, and stores it in a public bucket that accepts only WebP. Decoding and re-encoding keep only pixels, so hidden content and location metadata do not survive.

## Consequences

- Product images need no scanning vendor. Private documents still do.
- A seller could bypass the server and upload directly to their own folder, using their own login. The file must still be labelled WebP, cannot run in a browser, and is only shown if the server attached it to a product.
- The 4 MB limit keeps uploads within hosting request limits.
