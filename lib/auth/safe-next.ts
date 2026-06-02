// Validate a post-login redirect target — return the path only if it stays on
// our origin (else '/'), so a crafted `next` can't open-redirect off-site.
export function safeNext(next: string | null | undefined): string {
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
