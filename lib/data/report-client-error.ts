// The single seam for reporting client-side data-layer failures: swap the console for real error
// reporting (e.g. Sentry) here rather than scattering logging across per-call-site catches.
export function reportClientError(error: unknown) {
  // A .single() mutation matching no row rejects with PGRST116 — an expected outcome (RLS-filtered or
  // a stale id), not a fault, so don't report it as an error.
  if ((error as { code?: string } | null)?.code === 'PGRST116') return
  console.error(error)
}
