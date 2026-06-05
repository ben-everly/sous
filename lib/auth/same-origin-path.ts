const BASE = 'http://localhost'

// Prevents open redirects — an off-origin `next` falls back to '/'.
export function sameOriginPath(next: string | null | undefined): string {
  if (!next) return '/'
  try {
    const url = new URL(next, BASE)
    if (url.origin !== BASE) return '/'
    const path = url.pathname + url.search + url.hash
    return path.startsWith('/') ? path : '/'
  } catch {
    return '/'
  }
}
