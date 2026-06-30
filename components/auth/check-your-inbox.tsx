'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import type { AuthError } from '@supabase/supabase-js'
import { ResendButton } from '@/components/auth/resend-button'

export function CheckYourInbox({
  email,
  loginHref,
  onUseDifferentEmail,
  resend,
  resendLabel,
  resendSuccessMessage,
  children,
}: {
  email: string
  loginHref: string
  onUseDifferentEmail: () => void
  resend: () => Promise<{ error: AuthError | null }>
  resendLabel: string
  resendSuccessMessage: string
  children: ReactNode
}) {
  return (
    <>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
      </div>
      <div className="space-y-3 text-center text-sm">
        <p role="status" className="text-muted-foreground">
          {children}
        </p>
        <ResendButton
          email={email}
          resend={resend}
          label={resendLabel}
          successMessage={resendSuccessMessage}
        />
        <button
          type="button"
          onClick={onUseDifferentEmail}
          className="underline underline-offset-4"
        >
          Use a different email
        </button>
        <p>
          <Link href={loginHref} className="text-foreground underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </div>
    </>
  )
}
