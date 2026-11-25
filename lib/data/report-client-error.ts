import { KITCHEN_LIMIT, SLOT_LIMIT, codeOf } from './limit-errors'

const NO_ROW = 'PGRST116'
const HANDLED_AT_CALL_SITE = new Set<unknown>([NO_ROW, KITCHEN_LIMIT, SLOT_LIMIT])

// The single seam for reporting client-side data failures, wired to both the QueryClient's
// QueryCache.onError and MutationCache.onError: swap the console for real error reporting (e.g. Sentry)
// here rather than scattering logging across per-call-site catches. Reads are covered too — an initial
// load failure also surfaces as UI error status with a retry, but a post-load refetch failure would
// otherwise be silent.
// Before sending anywhere off-device, scrub: a PostgREST error's message/details/hint can carry row and
// column values, so report code plus a static category, not the raw fields.
export function reportClientError(error: unknown) {
  if (HANDLED_AT_CALL_SITE.has(codeOf(error))) return
  console.error(error)
}
