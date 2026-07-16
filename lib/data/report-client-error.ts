// The single seam for reporting client-side mutation failures, wired to the QueryClient's
// MutationCache.onError: swap the console for real error reporting (e.g. Sentry) here rather than
// scattering logging across per-call-site catches. Read failures aren't reported here — they surface
// as UI error status with a retry.
export function reportClientError(error: unknown) {
  // A .single() mutation matching no row rejects with PGRST116 — an expected outcome (RLS-filtered or
  // a stale id), not a fault, so don't report it as an error.
  if ((error as { code?: string } | null)?.code === 'PGRST116') return
  console.error(error)
}
