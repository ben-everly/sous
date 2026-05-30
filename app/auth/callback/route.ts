import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// OAuth redirect target. Always lands on `/` on success — no `next` parameter,
// so there is no open-redirect surface to sanitize. Error codes are the
// LoginError union defined in app/login/page.tsx.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)

  // User denied consent on Google's screen.
  if (searchParams.get('error') === 'access_denied') {
    return NextResponse.redirect(`${origin}/login?error=cancelled`)
  }

  const code = searchParams.get('code')
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}/`)
    }
    console.error('OAuth code exchange failed:', error.message)
  }

  // Missing code or a failed exchange.
  return NextResponse.redirect(`${origin}/login?error=auth`)
}
