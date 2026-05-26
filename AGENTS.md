# AI Agent Instructions (AGENTS.md)

This document serves as the core set of instructions and architectural rules for any AI agent interacting with the `sous` codebase. **You must adhere to these rules at all times.**

## 1. Coding Style & Preferences

- **Terse Code**: Write concise, succinct code. Avoid unnecessary boilerplate or overly verbose explanations in code.
- **Function Chaining**: Prefer function chaining over creating intermediate variable assignments whenever it maintains reasonable readability (e.g., `array.filter(...).map(...).reduce(...)` instead of assigning each step to a new variable).

## 2. Architecture & Tech Stack

- **Framework**: Next.js App Router (using React Server Components by default).
- **Client Components**: Only use `"use client"` at the lowest possible level in the component tree, specifically when interactivity (e.g., `useState`, `onClick`, `useEffect`) is strictly required.
- **Data Fetching**: Read directly in async React Server Components. Do not introduce Server Actions or API Routes for reads.
- **Business Logic**: Non-trivial mutation logic lives in `lib/services/` as plain async functions (no `'use server'`). Services own validation, authorization checks, DB calls, and side effects, and are unit-testable in isolation.
- **Data Mutations (web)**: Use **Server Actions** in `lib/actions/` as thin wrappers around `lib/services/` — resolve auth, call the service, then `revalidatePath`/`revalidateTag`. No business logic in actions.
- **HTTP Endpoints**: Use API Routes (`app/api/v1/...`) only for streaming responses (Vercel AI SDK), webhooks, and endpoints consumed by non-web clients (e.g., a future React Native app). These are also thin wrappers around `lib/services/`.
- **Supabase RPC**: For mutations that fit cleanly in a single SQL transaction and don't call external APIs, prefer a Postgres function (callable via `supabase.rpc(...)` from both web and mobile). RLS enforces authz.
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
  2. `npm run format:check`
  3. `npm run typecheck`
  4. `npm run test:unit`
  5. `npm run test:db` (when schema, RLS, or triggers changed)
  6. `npm run db:advisors` (when schema, RLS, or triggers changed)
  7. `npm run build`
     _(Note: E2E tests via Playwright should also be run before finalizing major user-facing milestones using `npx playwright test` or `npm run test:e2e`)._
- **Self-Correction**: If any of these commands fail, you are strictly required to proactively fix the errors before concluding your turn. Do not leave a broken build or failing tests for the user.
