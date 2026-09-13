export const mementoTimestamp = (header: string | null | undefined) => {
  if (!header) return null
  const at = Date.parse(header)
  return Number.isNaN(at)
    ? null
    : new Date(at)
        .toISOString()
        .replace(/[-:TZ.]/g, '')
        .slice(0, 14)
}

export const parseRetryAfter = (
  header: string | null | undefined,
  fallbackMs: number,
  capMs = 30_000,
) => {
  // A zero or past-dated Retry-After would otherwise fire every attempt back-to-back.
  const clamp = (ms: number) => (ms <= 0 ? fallbackMs : Math.min(capMs, ms))
  if (!header) return fallbackMs
  const seconds = Number(header)
  if (Number.isFinite(seconds)) return clamp(seconds * 1000)
  const at = Date.parse(header)
  return Number.isNaN(at) ? fallbackMs : clamp(at - Date.now())
}

export const backoffMs = (attempt: number, baseMs = 2_000, capMs = 30_000) =>
  Math.min(capMs, baseMs * 2 ** Math.max(0, attempt - 1))
