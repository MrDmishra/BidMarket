# 0001: Project foundation choices

**Date:** 4 November 2026
**Status:** Accepted, subject to the open decisions in ARCHITECTURE.md section 15

## Context

Phase 0 needed a runnable foundation before any Supabase, Vercel or provider accounts exist.

## Decisions

1. **TypeScript 6.0, not 7.0.** typescript-eslint supports versions below 6.1 at this date.
2. **Fonts are self-hosted through Fontsource.** Users' browsers make no font request to Google, and builds need no font network access.
3. **`APP_ENV` selects the environment.** `NODE_ENV` is `production` for every built deployment, so it cannot separate preview from production.
4. **Health uses the Supabase Auth health endpoint for now.** A direct database check needs a function that does not exist before the first migration.
5. **Sentry runs on the server only.** Browser reporting needs a public DSN, which is not on the approved `NEXT_PUBLIC_` list. All default collection of users, cookies, headers, bodies and query parameters is turned off.
6. **Search indexing is off** until launch.

## Consequences

- Upgrade TypeScript when the lint tooling allows it.
- Add a database check to `/api/health` in Phase 2.
- Decide on browser error reporting before launch.
- Remove `noindex` in Phase 11.
