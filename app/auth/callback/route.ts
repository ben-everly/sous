import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { type LoginError } from '@/lib/auth/login-errors'
import { sameOriginPath } from '@/lib/auth/same-origin-path'

const loginErrorUrl = (origin: string, error: LoginError) => `${origin}/login?error=${error}`

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)

  // User denied consent on Google's screen.
  if (searchParams.get('error') === 'access_denied') {
    return NextResponse.redirect(loginErrorUrl(origin, 'cancelled'))
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

  return NextResponse.redirect(loginErrorUrl(origin, 'auth'))
}
