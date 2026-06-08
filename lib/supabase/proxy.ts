import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database.types'
import { env } from '@/lib/env'

export function isPublicPath(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/auth/')
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Don't run code between createServerClient and getClaims — getClaims refreshes
  // the session and writes the refreshed cookies onto `response`. Auth gate only
  // (RLS authorizes data). Fail secure: a thrown or errored getClaims counts as
  // no session.
  const claims = await supabase.auth
    .getClaims()
    .then(({ data, error }) => (error ? null : (data?.claims ?? null)))
    .catch(() => null)

  const { pathname } = request.nextUrl
  if (!claims && !isPublicPath(pathname)) {
    const dest = pathname + request.nextUrl.search
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    if (dest !== '/') url.searchParams.set('next', dest)
    return NextResponse.redirect(url)
  }

  return response
}
