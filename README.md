# Bid Market

A private B2B marketplace for direct orders, tenders and reverse auctions in India.

Start with `AGENTS.md` and the documents in `docs/`.

## Requirements

- Node.js 22 (see `.nvmrc`)
- npm

## Set up

```bash
npm ci
cp .env.example .env.local
npm run dev
```

The app runs without Supabase in local development. `/api/health` reports `not_configured` until
you add the Supabase values to `.env.local`.

## Scripts

| Command                | Purpose                                         |
| ---------------------- | ----------------------------------------------- |
| `npm run dev`          | Start the development server                    |
| `npm run build`        | Create a production build                       |
| `npm run start`        | Serve the production build                      |
| `npm run lint`         | Run ESLint                                      |
| `npm run typecheck`    | Run the TypeScript check                        |
| `npm run format`       | Format files with Prettier                      |
| `npm run format:check` | Check formatting                                |
| `npm test`             | Run unit tests                                  |
| `npm run test:e2e`     | Run Playwright tests against a built app        |
| `npm run test:db`      | Run database tests (needs PostgreSQL and pgTAP) |
| `npm run check`        | Run lint, types, formatting and unit tests      |
