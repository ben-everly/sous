export function isPublicPath(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/auth/')
}

export function loginRedirectPath(pathname: string, search: string): string {
  const dest = pathname + search
  const params = new URLSearchParams()
  if (dest !== '/') params.set('next', dest)
  const query = params.toString()
  return query ? `/login?${query}` : '/login'
}
