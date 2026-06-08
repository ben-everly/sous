import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { type LoginError } from '@/lib/auth/login-errors'
import { sameOriginPath } from '@/lib/auth/same-origin-path'

const loginErrorUrl = (origin: string, error: LoginError, next: string | null) => {
  const params = new URLSearchParams({ error })
  if (next) params.set('next', next)
  return `${origin}/login?${params}`
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const next = searchParams.get('next')
  const providerError = searchParams.get('error')

  // User denied consent on Google's screen.
  if (providerError === 'access_denied') {
    return NextResponse.redirect(loginErrorUrl(origin, 'cancelled', next))
  }

  if (providerError) {
    console.error('OAuth provider error:', providerError, searchParams.get('error_description'))
  }

  const code = searchParams.get('code')
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${sameOriginPath(next)}`)
    }
    console.error('OAuth code exchange failed:', error.message)
  }

  // failed exchange, provider error, or a bare/replayed hit.
  return NextResponse.redirect(loginErrorUrl(origin, 'auth', next))
}
