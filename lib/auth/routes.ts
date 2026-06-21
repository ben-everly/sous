export const AUTH_PATHS = {
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
} as const

const PUBLIC_PATHS = new Set<string>(Object.values(AUTH_PATHS))

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname) || pathname.startsWith('/auth/')
}

export function withNext(path: string, next: string | null | undefined): string {
  return next ? `${path}?next=${encodeURIComponent(next)}` : path
}

export function loginRedirectPath(pathname: string, search: string): string {
  const dest = pathname + search
  const params = new URLSearchParams()
  if (dest !== '/') params.set('next', dest)
  const query = params.toString()
  return query ? `${AUTH_PATHS.login}?${query}` : AUTH_PATHS.login
}
