# 0002: Native UI primitives and public preview rules

**Date:** 4 November 2026
**Status:** Accepted

## Context

Phase 1 needed a dialog, disclosure panels and accessibility testing. ARCHITECTURE.md had allowed Radix UI.

## Decisions

1. **Use the native `dialog` and `details` elements.** They supply focus handling and keyboard support without a dependency. Add Radix UI only when a later component needs it.
2. **Add `@axe-core/playwright` as a development dependency** for automated WCAG checks.
3. **Keep loading boundaries inside route groups.** A root boundary starts streaming before `notFound()` runs, which returned status 200 from a hidden page.
4. **Show `/internal/components` only outside production.**
5. **Work directly on `main` for Phase 1,** on the owner's instruction. The repository stays public.

## Consequences

- Fee values on public pages come from `PROPOSED_FEES` until Phase 4 moves them to `platform_settings`.
- AGENTS.md still says not to work on `main`. Confirm whether that rule should change.
