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

Open [http://localhost:3000](http://localhost:3000). If port 3000 is taken, Next picks the next free port; Google OAuth is configured for `3000`–`3009`, so sign-in keeps working on any of those.

After any schema change, regenerate types:

```bash
npm run db:types
```

## Scripts

| Command                           | What it does                                 |
| --------------------------------- | -------------------------------------------- |
| `npm run dev`                     | Start the Next.js dev server                 |
| `npm run build`                   | Production build                             |
| `npm run start`                   | Serve the production build                   |
| `npm run lint`                    | ESLint                                       |
| `npm run typecheck`               | TypeScript (no emit)                         |
| `npm run format` / `format:check` | Prettier write / check                       |
| `npm run test:unit`               | Vitest (unit + integration)                  |
| `npm run test:e2e`                | Playwright (E2E)                             |
| `npm run test:db`                 | pgTAP database tests                         |
| `npm run db:start` / `db:stop`    | Start / stop local Supabase                  |
| `npm run db:reset`                | Reset the local database                     |
| `npm run db:types`                | Regenerate `types/database.types.ts`         |
| `npm run db:advisors`             | Run Supabase security/performance advisors   |
| `npm run worktree:init`           | Link shared dev files into a linked worktree |

## Working with git worktrees

All git worktrees of this repo share **one** local Supabase stack — the CLI keys its Docker containers by `project_id`, so there's a single database, auth instance, and JWT signing key across every checkout. A few consequences:

- **Link shared dev files into a new worktree.** After creating a worktree, run `npm run worktree:init`: it symlinks `.env` and `supabase/signing_keys.json` from the primary checkout so the worktree boots against the shared stack. The signing key is symlinked, not copied — a divergent key silently invalidates every session.
- **Destructive DB commands are guarded outside the primary checkout.** `db:reset` and `db:stop` refuse to run from a linked worktree, since they'd disrupt every checkout. Run them from the primary, or set `FORCE_SHARED_SUPABASE=1` to override.
- **The primary checkout must stay put.** Linked worktrees symlink into it, so moving, renaming, or removing the primary leaves them with dangling links (missing `.env`, invalidated sessions). Re-run `npm run worktree:init` in each worktree after relocating the primary.
- **DB-touching commands serialize automatically.** `db:start`, `db:reset`, `db:stop`, `test:db` (pgTAP), and `test:e2e` operate on the shared stack, so each takes an exclusive lock — a run from a second worktree waits rather than clobbering it. (Serialization needs `flock`, present on Linux and CI; on stock macOS it's absent — `brew install flock` to enable it. Without it these commands refuse to run, since an unserialized run can corrupt the shared stack; set `ALLOW_UNSERIALIZED_SUPABASE=1` to override.) `test:unit` is safe regardless — Supabase is mocked.
- **Each dev server takes its own port.** With several worktrees running `npm run dev`, Next falls back through `3001`+; OAuth is configured for `3000`–`3009` (see [Setup](#setup)).

## Deployment

See [`docs/DEPLOY.md`](./docs/DEPLOY.md) for the production setup checklist.
