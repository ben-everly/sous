import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { type LoginError } from '@/lib/auth/login-errors'
import { sameOriginPath } from '@/lib/auth/same-origin-path'

const loginErrorUrl = (origin: string, error: LoginError, next: string) => {
  const params = new URLSearchParams({ error })
  if (next !== '/') params.set('next', next)
  return `${origin}/login?${params}`
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const next = sameOriginPath(searchParams.get('next'))
  const providerError = searchParams.get('error')
  // Recovery links route through here via next=/reset-password; their failures
  // belong on /forgot-password, not the generic login error.
  const recoveryFlow = next.startsWith('/reset-password')

  // GoTrue redirects an expired/used recovery link here as error=access_denied; route
  // it to /forgot-password, not the OAuth "cancelled" notice. Other access_denied (denied
  // consent, the rare org-policy block) is a genuine cancellation.
  if (providerError === 'access_denied') {
    return NextResponse.redirect(
      recoveryFlow
        ? `${origin}/forgot-password?error=recovery_invalid`
        : loginErrorUrl(origin, 'cancelled', next),
    )
  }

  if (providerError) {
    console.error('OAuth provider error:', providerError, searchParams.get('error_description'))
  }

  const code = searchParams.get('code')
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('OAuth code exchange failed:', error.message)
  }

  // failed exchange, provider error, or a bare/replayed hit.
  if (recoveryFlow) {
    return NextResponse.redirect(`${origin}/forgot-password?error=recovery_invalid`)
  }
  return NextResponse.redirect(loginErrorUrl(origin, 'auth', next))
}
