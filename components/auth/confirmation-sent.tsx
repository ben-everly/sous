'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ResendConfirmationButton } from '@/components/auth/resend-confirmation-button'

// The post-send "check your email" body, shared by the signup and standalone-resend flows.
// The message copy differs per flow, so callers pass it as children; everything else is common.
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
    <>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
      </div>
      <div className="space-y-3 text-center text-sm">
        <p role="status" className="text-muted-foreground">
          {children}
        </p>
        <ResendConfirmationButton email={email} seedCooldown />
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
