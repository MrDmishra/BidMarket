# 0003: Field encryption in Supabase Vault

**Date:** 4 November 2026
**Status:** Accepted, pending your review

## Context

ARCHITECTURE.md planned encryption in the app with keys in environment variables. Setting those keys from an AI session would expose them in the conversation.

## Decision

Generate the keys inside the database with Supabase Vault. Postgres functions encrypt PAN and bank numbers with pgcrypto AES-256, and create the PAN lookup hash.

## Consequences

- Keys never appear in code, chat or Vercel.
- Plain values reach Postgres as function arguments, so statement logging must stay off for them.
- Anyone with full database administrator access can decrypt. Limit that access.
- A key rotation procedure is still needed before launch.
- Bank decryption is not needed until a feature requires it.
