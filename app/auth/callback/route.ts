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

  // User denied consent on Google's screen.
  if (searchParams.get('error') === 'access_denied') {
    return NextResponse.redirect(loginErrorUrl(origin, 'cancelled', searchParams.get('next')))
  }

  const code = searchParams.get('code')
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${sameOriginPath(searchParams.get('next'))}`)
    }
    console.error('OAuth code exchange failed:', error.message)
  }

  const providerError = searchParams.get('error')
  if (providerError) {
    console.error('OAuth provider error:', providerError, searchParams.get('error_description'))
  }

  return NextResponse.redirect(loginErrorUrl(origin, 'auth', searchParams.get('next')))
}
