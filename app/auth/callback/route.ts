import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { type LoginError } from '@/lib/auth/login-errors'
import { RECOVERY_INVALID_URL } from '@/lib/auth/forgot-password-errors'
import { AUTH_PATHS } from '@/lib/auth/routes'
import { sameOriginPath } from '@/lib/auth/same-origin-path'

const loginErrorUrl = (origin: string, error: LoginError, next: string) => {
  const params = new URLSearchParams({ error })
  if (next !== '/') params.set('next', next)
  return `${origin}${AUTH_PATHS.login}?${params}`
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const next = sameOriginPath(searchParams.get('next'))
  const providerError = searchParams.get('error')
  // Recovery links route through here via next=/reset-password; their failures
  // belong on /forgot-password, not the generic login error. Match must stay exact
  // (===): a prefix check would let next=/reset-password-evil hijack the recovery branch.
  const recoveryFlow = next === AUTH_PATHS.resetPassword

  // GoTrue redirects an expired/used recovery link here as error=access_denied; route
  // it to /forgot-password, not the OAuth "cancelled" notice. Other access_denied (denied
  // consent, the rare org-policy block) is a genuine cancellation.
  if (providerError === 'access_denied') {
    return NextResponse.redirect(
      recoveryFlow ? `${origin}${RECOVERY_INVALID_URL}` : loginErrorUrl(origin, 'cancelled', next),
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
    return NextResponse.redirect(`${origin}${RECOVERY_INVALID_URL}`)
  }
  return NextResponse.redirect(loginErrorUrl(origin, 'auth', next))
}
