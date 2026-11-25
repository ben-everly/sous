import { KITCHEN_LIMIT } from './limit-errors'

// Expected outcomes, not faults, so don't report them as errors: a .single() mutation matching no row
// rejects with PGRST116 (RLS-filtered or a stale id), and a create past a DB row cap rejects with its
// limit code, which the call site already explains to the user.
const EXPECTED_CODES = new Set(['PGRST116', KITCHEN_LIMIT])

// The single seam for reporting client-side data failures, wired to both the QueryClient's
// QueryCache.onError and MutationCache.onError: swap the console for real error reporting (e.g. Sentry)
// here rather than scattering logging across per-call-site catches. Reads are covered too — an initial
// load failure also surfaces as UI error status with a retry, but a post-load refetch failure would
// otherwise be silent.
// Before sending anywhere off-device, scrub: a PostgREST error's message/details/hint can carry row and
// column values, so report code plus a static category, not the raw fields.
export function reportClientError(error: unknown) {
  const code = (error as { code?: string } | null)?.code
  if (code && EXPECTED_CODES.has(code)) return
  console.error(error)
}
