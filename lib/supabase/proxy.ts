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

  // Must be called immediately after createServerClient — the SDK refreshes the
  // session here. AUTHENTICATION GATE ONLY: proves identity, never authorizes
  // data access (RLS does that). getClaims() verifies the JWT locally, so a
  // revoked token passes until it expires. Fail secure — any error is treated
  // as "no session".
  let claims = null
  try {
    const { data, error } = await supabase.auth.getClaims()
    claims = error ? null : (data?.claims ?? null)
  } catch {
    claims = null
  }

  const { pathname } = request.nextUrl
  if (!claims && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return response
}
