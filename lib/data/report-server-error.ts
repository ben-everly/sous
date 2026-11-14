import 'server-only'

// The single seam for reporting server-side data failures, the server twin of reportClientError: a
// failed prefetch falls back to the browser fetch, so without this a server-only fault leaves no trace.
// Before sending anywhere off-box, scrub: a PostgREST error's message/details/hint can carry row and
// column values, so report code plus a static category, not the raw fields.
export function reportServerError(error: unknown) {
  console.error(error)
}
