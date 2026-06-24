import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyEmailToken } from '@/lib/auth/verify-email-token'
import { OTP_TYPES } from '@/lib/auth/otp-types'
import { AUTH_PATHS } from '@/lib/auth/routes'

// Pure verify-and-redirect, sibling of /auth/callback. Reads only token_hash; the verify
// type is the signup CONSTANT, never the URL's `type` — so a recovery token submitted here
// is redeemed as signup and rejected by GoTrue, keeping recovery on its own gated path.
// Never log request.url/searchParams: token_hash must not reach logs.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const invalid = `${origin}${AUTH_PATHS.login}?error=confirmation_invalid`

  if (!tokenHash) return NextResponse.redirect(invalid)

  const supabase = await createClient()
  const result = await verifyEmailToken(supabase, { tokenHash, type: OTP_TYPES.signup })
  return NextResponse.redirect(result.ok ? `${origin}/` : invalid)
}
