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

Open [http://localhost:3000](http://localhost:3000). If port 3000 is taken, Next picks the next free port; Google OAuth is allowlisted for `3000`–`3009`, so sign-in keeps working on any of those — but not above `3009`, where it silently no-ops.

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

- **Link shared dev files into a new worktree.** After creating a worktree, run `npm run worktree:init`: it symlinks `.env` (edits propagate to every worktree) and `supabase/signing_keys.json` from the primary checkout so the worktree boots against the shared stack. Keep per-worktree overrides in `.env.local`, which is deliberately not linked. The signing key is symlinked, not copied — a divergent key silently invalidates every session.
- **Destructive DB commands are guarded outside the primary checkout.** `db:reset` and `db:stop` refuse to run from a linked worktree, since they'd disrupt every checkout. Run them from the primary, or set `FORCE_SHARED_SUPABASE=1` to override.
- **The primary checkout must stay put.** Linked worktrees symlink into it, so moving, renaming, or removing the primary leaves them with dangling links (missing `.env`, invalidated sessions). Re-run `npm run worktree:init` in each worktree after relocating the primary.
- **DB-touching commands serialize across worktrees.** `db:start`, `db:reset`, `db:stop`, `test:db` (pgTAP), and `test:e2e` operate on the shared stack, so once a second worktree exists each takes an exclusive lock — a run from another worktree waits rather than clobbering it. A lone checkout has nothing to contend with, so it skips the lock entirely — no `flock` needed. (Locking needs `flock`, present on Linux and CI; on stock macOS it's absent — `brew install flock` to enable it. Once you have a second worktree, these commands refuse to run without it, since an unserialized run can corrupt the shared stack; set `ALLOW_UNSERIALIZED_SUPABASE=1` to override.) `test:unit` is safe regardless — Supabase is mocked.
- **Each dev server takes its own port.** With several worktrees running `npm run dev`, Next falls back through `3001`+, and OAuth is allowlisted only for `3000`–`3009` (see [Setup](#setup)). **If Google sign-in does nothing — no error, just a silent no-op — check the port in your address bar.** A server above `3009` (an 11th concurrent one, or one bumped past the range because lower ports are taken) gets a redirect URL that isn't allowlisted; free a port in range and restart `npm run dev`.

## Deployment

See [`docs/DEPLOY.md`](./docs/DEPLOY.md) for the production setup checklist.
