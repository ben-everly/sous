// Prevents open redirects — an off-origin `next` falls back to '/'.
export function sameOriginPath(next: string | null | undefined): string {
  if (!next) return '/'
  try {
    const url = new URL(next, 'http://localhost')
    if (url.origin !== 'http://localhost') return '/'
    const path = url.pathname + url.search + url.hash
    return path.startsWith('/') ? path : '/'
  } catch {
    return '/'
  }
}
