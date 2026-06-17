# AI Agent Instructions (AGENTS.md)

This document serves as the core set of instructions and architectural rules for any AI agent interacting with the `sous` codebase. **You must adhere to these rules at all times.**

## 1. Coding Style & Preferences

- **Terse Code**: Write concise, succinct code. Avoid unnecessary boilerplate or overly verbose explanations in code.
- **Function Chaining**: Prefer function chaining over creating intermediate variable assignments whenever it maintains reasonable readability (e.g., `array.filter(...).map(...).reduce(...)` instead of assigning each step to a new variable).
- **Comments earn their place**: A comment must add context the code cannot — a non-obvious _why_: a footgun, a trust/security boundary, or an intentional tradeoff and the alternative it rejects. If a comment only restates what the code plainly does, delete it. When in doubt, prefer no comment.
- **No archaeology, no narration**: Never write comments that explain what the code used to do, what was just removed, or how the design evolved — that is what git history is for. Likewise, don't list a symbol's callers or importers; "Find usages"/grep tracks that live, and a hand-written copy only drifts. Don't re-describe a well-known language, library, or framework API, or a standard idiom — assume the reader can look it up; comment the surprising, not the standard.
- **Keep comments terse**: When a comment earns its place, make it tight — the fewest words that carry the _why_. No preamble, no hedging, no restating the code around it. State the surprising fact, then stop — don't spell out the consequences that follow from it; the reader can derive those. When the noteworthy thing is a deliberate omission, say it's deliberate and why, nothing more. Prefer one line; let length follow necessity, not habit.

  _Example — trim the derivable consequence:_

  ```ts
  // ❌ signInWithOAuth resolves before the browser leaves the page. Keep `pending`
  //    true so the spinner persists through that navigation.
  // ✅ signInWithOAuth resolves before the browser leaves the page — so the success
  //    path deliberately leaves `pending` set.
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
- **Backend**: Supabase (Postgres with RLS, Supabase Auth).
- **AI**: Vercel AI SDK with strict Zod schemas for structured extraction.
- **Testing**: Vitest (unit/integration), Playwright (E2E), pgTAP (database).

## 3. Supabase & Database Rules

- **Strict Typing**: You must _always_ use the generated Supabase types from `types/database.types.ts` when interacting with the database.
- **Regenerate Types**: Run `npm run db:types` after any schema change to keep `types/database.types.ts` in sync, and commit the result alongside the migration.
- **Table Naming**: The schema uses `snake_case` lowercase identifiers (Postgres convention). Do not hallucinate PascalCase or quoted variants.

## 4. The "No-Breakage Guarantee", Testing & Verification Protocol

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
