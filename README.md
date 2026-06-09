# Sous

Home kitchen management — inventory, recipes, and meal plans.

Built on Next.js 16 (App Router) and Supabase. See [`AGENTS.md`](./AGENTS.md) for coding conventions and architectural rules.

## Prerequisites

- Node.js 20+
- Docker (for the local Supabase stack)

## Setup

```bash
npm install
npm run db:start                              # generates the JWT signing key, then boots local Supabase
cp .env.example .env                          # then fill in from `npx supabase status -o env`
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

After any schema change, regenerate types:

```bash
npm run db:types
```

## Scripts

| Command                           | What it does                               |
| --------------------------------- | ------------------------------------------ |
| `npm run dev`                     | Start the Next.js dev server               |
| `npm run build`                   | Production build                           |
| `npm run start`                   | Serve the production build                 |
| `npm run lint`                    | ESLint                                     |
| `npm run typecheck`               | TypeScript (no emit)                       |
| `npm run format` / `format:check` | Prettier write / check                     |
| `npm run test:unit`               | Vitest (unit + integration)                |
| `npm run test:e2e`                | Playwright (E2E)                           |
| `npm run test:db`                 | pgTAP database tests                       |
| `npm run db:start` / `db:stop`    | Start / stop local Supabase                |
| `npm run db:reset`                | Reset the local database                   |
| `npm run db:types`                | Regenerate `types/database.types.ts`       |
| `npm run db:advisors`             | Run Supabase security/performance advisors |

## Deployment

See [`docs/DEPLOY.md`](./docs/DEPLOY.md) for the production setup checklist.
