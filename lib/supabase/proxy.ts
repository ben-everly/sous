import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database.types'
import { env } from '@/lib/env'

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

  // Must be called immediately after createServerClient with no intervening
  // logic — the SDK relies on this call to refresh the session.
  // AUTHENTICATION GATE ONLY — proves who the user is, never authorizes data access.
  // Fail secure: a throw/error counts as "no session", not "let through".
  let claims = null
  try {
    claims = (await supabase.auth.getClaims()).data?.claims ?? null
  } catch {
    claims = null
  }

  const { pathname } = request.nextUrl
  // Exact match for /login; prefix for the whole OAuth subtree.
  const isPublic = pathname === '/login' || pathname.startsWith('/auth/')
  if (!claims && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return response
}
