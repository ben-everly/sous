'use client'

import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { OTP_TYPES } from '@/lib/auth/otp-types'
import { AUTH_PATHS } from '@/lib/auth/routes'
import { CheckYourInbox } from '@/components/auth/check-your-inbox'

export function ConfirmationSent({
  email,
  loginHref,
  onUseDifferentEmail,
  children,
}: {
  email: string
  loginHref: string
  onUseDifferentEmail: () => void
  children: ReactNode
}) {
  return (
    <CheckYourInbox
      email={email}
      loginHref={loginHref}
      onUseDifferentEmail={onUseDifferentEmail}
      resend={() =>
        createClient().auth.resend({
          type: OTP_TYPES.signup,
          email,
          options: { emailRedirectTo: `${window.location.origin}${AUTH_PATHS.confirm}` },
        })
      }
      resendLabel="Resend confirmation email"
      resendSuccessMessage="Confirmation email sent."
    >
      {children}
    </CheckYourInbox>
  )
}
