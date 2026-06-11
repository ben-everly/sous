import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database.types'
import { env } from '@/lib/env'
import { getClaimsFrom } from '@/lib/auth/claims'
import { isPublicPath, loginRedirectPath } from '@/lib/auth/routes'

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
  // (RLS authorizes data).
  const claims = await getClaimsFrom(supabase)

  const { pathname, search } = request.nextUrl
  if (!claims && !isPublicPath(pathname)) {
    return NextResponse.redirect(new URL(loginRedirectPath(pathname, search), request.url))
  }

  return response
}
