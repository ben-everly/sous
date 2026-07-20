# AI Agent Instructions (AGENTS.md)

This document serves as the core set of instructions and architectural rules for any AI agent interacting with the `sous` codebase. **You must adhere to these rules at all times.**

## 1. Coding Style & Preferences

- **Terse Code**: Write concise, succinct code. Avoid unnecessary boilerplate or overly verbose explanations in code.
- **Function Chaining**: Prefer function chaining over creating intermediate variable assignments whenever it maintains reasonable readability (e.g., `array.filter(...).map(...).reduce(...)` instead of assigning each step to a new variable).
- **Comments are a liability**: each one can rot or mislead, so default to none. A comment earns its keep only by adding what the code cannot — a _why_ the code can't show. If you can't name what it adds, delete it. Never narrate: no restating the code, no history (git's job), no caller lists (grep's job), no re-describing standard APIs.

  _Example — most comments fail the bar; delete them. The rare one earns its keep:_

  ```ts
  // ❌ delete — restates the code
  // increment the retry count
  retries++

  // ❌ delete — narrates history
  // switched from getSession to getClaims after the cookie bug
  const { data } = await supabase.auth.getClaims()

  // ✅ keep — a why the code can't show
  // getClaims resolves before the browser leaves the page, so the success
  // path deliberately leaves `pending` set through the redirect.
  const { data } = await supabase.auth.getClaims()
  ```

## 2. Architecture & Tech Stack

- **Framework**: Next.js App Router. Server Components render the static shell; reach for Client Components wherever you touch Supabase data or need interactivity.
- **Data access — client-first**: Prefer the **browser Supabase client** for reads and mutations (including auth — login/logout). RLS is the enforcement boundary, so direct client access is safe and unlocks realtime, optimistic updates, and logic shared with a future mobile client.
- **Enforce invariants in the database, not app code**: Because clients talk to Supabase directly, every domain invariant must live in Postgres — RLS for authz, `CHECK`/`FK`/`UNIQUE` constraints and triggers for integrity, or an RPC for multi-row transactional rules. App-layer checks are UX, not security.
- **When to go server-side**: Use the server (RSC / services / Server Actions / RPC) only when an operation _requires_ it:
  - it needs a **secret** or an **external API** (AI/LLM, payments, email/SMS);
  - it must **Zod-parse untrusted or LLM output** before persisting;
  - it needs **heavy or sensitive computation** unsafe or impractical on the client;
  - it needs **multi-row transactional integrity** → prefer a Postgres function via `supabase.rpc(...)` (callable from web and mobile; RLS enforces authz);
  - it is **persistent app-shell UI** (header, nav) reading data the request already has server-side.
- **Server reads (RSC)**: When a read must be server-side (per above), read directly in an async Server Component. Do not use Server Actions or API Routes for reads.
- **Business Logic**: Server-required logic lives in `lib/services/` as plain, framework-agnostic async functions (no `'use server'`) — validation, external calls, side effects — unit-testable in isolation and shareable with mobile.
- **Data Mutations (web)**: When a mutation must run server-side, wrap the service in a **Server Action** in `lib/actions/` — resolve auth, call the service, then `revalidatePath`/`revalidateTag`. No business logic in actions.
- **HTTP Endpoints**: Use API Routes (`app/api/v1/...`) only for streaming responses (Vercel AI SDK), webhooks, and endpoints consumed by non-web clients (e.g., a future React Native app). These are also thin wrappers around `lib/services/`.
- **Client Components**: Keep `"use client"` at the lowest practical level — a data/interactivity leaf, not a whole page.
- **Domain logic lives apart from the UI**: Business rules, data access, validation, and contracts go in framework-agnostic modules (`lib/services/`, query functions, Zod schemas, `lib/auth/login-errors.ts`) — no UI-framework imports (React/Next/`react-dom`). Components stay thin: call that layer and render. The payoff is logic that is unit-testable in isolation and portable across renderers — a web (DOM) UI and a future React Native UI never share components, but both sit on the same core.
- **Guard the client/server boundary**: A module that touches secrets or server-only APIs (`next/headers`, `next/cache`, `createServerClient`) must start with `import 'server-only'`, so an accidental client import fails the build instead of leaking to the browser. Client-exposed config must use a `NEXT_PUBLIC_` prefix (validated in `lib/env.ts`); unprefixed secrets stay server-side.
- **Styling**: Use strictly Tailwind CSS utility classes and `shadcn/ui` components. Do not create custom `.css` or `.scss` files unless absolutely necessary for a global reset.
- **Forms**: Build forms with `react-hook-form` + `zodResolver` on the shadcn `Form` primitives — the established house pattern. Don't hand-roll form state or introduce a second forms library.
- **Backend**: Supabase (Postgres with RLS, Supabase Auth).
- **AI**: Vercel AI SDK with strict Zod schemas for structured extraction.
- **Testing**: Vitest (unit/integration), Playwright (E2E), pgTAP (database).

### 2.1 Client data layer (TanStack Query + @supabase-cache-helpers)

Worked example: `components/kitchens/use-kitchens.ts` (hook) + `lib/kitchens/queries.ts` (query builder + RPC wrappers). Follow this shape for new entity cards rather than re-deriving it.

- **Query keys**: never hand-roll one. `useQuery`/`encode` derive the key from the query builder itself.
- **Reads**: export a builder factory (e.g. `allKitchensQuery(supabase)`) returning a PostgREST query — not an awaited promise — and pass it straight to `useQuery(...)`. A reopen/refresh is `queryClient.invalidateQueries({ queryKey })`, not a manual refetch.
- **Read shape**: one unfiltered query as the sole source, partitioned client-side (live/trash/count from a single `kitchens` read), is preferred when the read is cheap — it avoids racing a separate count/filtered query. Reach for separate live-filtered and trash-filtered queries instead when returning every row to derive a subset is unacceptable (large tables). cache-helpers keeps multiple filtered lists consistent on a write by evaluating each list's PostgREST filter (`PostgrestFilter.apply` + `orderBy`) against the mutated row — no manual invalidation needed across lists.
- **Plain writes**: table inserts/updates with no side invariants use cache-helpers' `useInsertMutation` / `useUpdateMutation` directly against `supabase.from(table)` — they reconcile the cache from the mutation's returned representation by primary key, no manual invalidation.
- **RPC writes**: when invariants (state guards, authz) live in a `security-invoker` RPC, drive it with a plain `useMutation` on the optimistic lifecycle: `onMutate` awaits `queryClient.cancelQueries({ queryKey })`, then writes the optimistic row by PK (`upsertItem` for an update/restore, `deleteItem` for a destructive call), projected to the cached columns (`COLUMNS` in `queries.ts`); `onError` reverses that single by-PK write and toasts; `onSettled` calls `invalidateQueries({ queryKey })` to reconcile to server truth. Reverse only the mutated row, so a concurrent mutation on another row survives the rollback.
- **Trust DB-enforced idempotency, no in-flight guard**: an RPC wrapper rejects only when `error != null` — a non-erroring response, including a zero-row no-op, is success. There is no per-row in-flight registry gating concurrent calls. Two concurrent calls on the same row are both harmless idempotent successes; a cross-type race (e.g. a restore firing while a delete is in flight) is last-write-wins, corrected by the losing mutation's settle-time `invalidateQueries` refetch.
- **Error reporting**: mutation rejections surface through the root `MutationCache.onError` sink (`reportClientError`, wired in `app/providers.tsx`) — don't hand-log at the call site.
- **Exceptions**: fall back to separate filtered reads only when returning every row to derive a subset is genuinely too costly (large tables); reach for a hand-rolled reconcile only where invalidate-on-settle's extra read or its brief eventual-consistency window is unacceptable, and document the reason at the call site.
- **Realtime — extension point, not yet shipped (SIDE-177)**: cache-helpers' `useSubscription` / `useSubscriptionQuery` are where a future realtime feed attaches, writing into the same query-key-derived cache entries reads already populate. No realtime subscription exists yet.

## 3. Supabase & Database Rules

- **Strict Typing**: You must _always_ use the generated Supabase types from `types/database.types.ts` when interacting with the database.
- **Regenerate Types**: Run `npm run db:types` after any schema change to keep `types/database.types.ts` in sync, and commit the result alongside the migration.
- **Table Naming**: The schema uses `snake_case` lowercase identifiers (Postgres convention). Do not hallucinate PascalCase or quoted variants.
- **Plan schema changes as their own branch**: All worktrees share one local Supabase stack, so do them first on a dedicated branch (migration + `npm run db:types` + RLS/pgTAP tests), separate from feature-code branches. Don't start a feature-code branch until the schema branch has landed in `main`.

## 4. Specs & Planning

- **Specs live in Linear**: Save every design spec as a Linear issue in the **Sous** project on the **Side Work (SIDE)** team — not as a file in the repo. The issue is the source of truth; reference it by its `SIDE-###` identifier in plans, branches, and PRs.
- **Worktree location**: Create git worktrees as siblings of the repo at `../sous-<ticket_id>-<description>` (e.g. `../sous-SIDE-127-kitchens`).

## 5. The "No-Breakage Guarantee", Testing & Verification Protocol

- **Self-Verification**: After completing any significant feature, modification, or milestone, you **must** autonomously run the following commands to verify the build is not broken and tests pass:
  1. `npm run lint`
  2. `npm run lint:sh` (when `scripts/*.sh` changed)
  3. `npm run test:sh` (when `scripts/*.sh` changed)
  4. `npm run format:check`
  5. `npm run typecheck`
  6. `npm run test:unit`
  7. `npm run test:db` (when schema, RLS, or triggers changed)
  8. `npm run db:advisors` (when schema, RLS, or triggers changed)
  9. `npm run build`
     _(Note: E2E tests via Playwright should also be run before finalizing major user-facing milestones using `npx playwright test` or `npm run test:e2e`)._
- **Self-Correction**: If any of these commands fail, you are strictly required to proactively fix the errors before concluding your turn. Do not leave a broken build or failing tests for the user.
