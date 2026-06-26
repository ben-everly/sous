'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { verifyEmailToken } from '@/lib/auth/verify-email-token'
import { OTP_TYPES } from '@/lib/auth/otp-types'
import { CONFIRMATION_INVALID_URL } from '@/lib/auth/login-errors'
import { Spinner } from '@/components/ui/spinner'

// The single-use confirmation token is consumed on the CLIENT after mount, not in a GET
// route: email-security scanners (Safe Links, Proofpoint) fire prefetch GETs that would burn
// a server route's token, but don't run JS. Mirrors the recovery flow in reset-password-form.
// The ref guard keeps verifyOtp to once under StrictMode (dev).
export function ConfirmEmail() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const verifyStarted = useRef(false)

  useEffect(() => {
    if (verifyStarted.current) return
    verifyStarted.current = true
    const tokenHash = searchParams.get('token_hash')
    if (!tokenHash) {
      router.replace(CONFIRMATION_INVALID_URL)
      return
    }
    // type is the signup CONSTANT, never the URL's `type`: a recovery token redeemed here is
    // rejected by GoTrue, keeping recovery on its own gated path.
    verifyEmailToken(createClient(), { tokenHash, type: OTP_TYPES.signup })
      .then((result) => {
        // Full navigation (not router.push) so the server re-reads the new session cookie;
        // replace() also drops the spent-token URL from history.
        if (result.ok) window.location.replace('/')
        else router.replace(CONFIRMATION_INVALID_URL)
      })
      .catch(() => router.replace(CONFIRMATION_INVALID_URL))
  }, [router, searchParams])

  return <Spinner />
}
