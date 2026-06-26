'use client'

import { ResendConfirmationButton } from './resend-confirmation-button'

export function CheckInbox({
  email,
  onUseDifferentEmail,
}: {
  email: string
  onUseDifferentEmail: () => void
}) {
  return (
    <div className="space-y-3 text-center text-sm">
      <p role="status" className="text-muted-foreground">
        We&apos;ve sent a confirmation link to{' '}
        <span className="text-foreground font-medium">{email}</span>. Click it to finish creating
        your account. It can take a minute to arrive — check your spam folder if you don&apos;t see
        it.
      </p>
      <ResendConfirmationButton email={email} seedCooldown />
      <p className="text-muted-foreground text-xs">
        Opening the link on another device signs you in there — you can safely close this tab.
      </p>
      <button type="button" onClick={onUseDifferentEmail} className="underline underline-offset-4">
        Use a different email
      </button>
    </div>
  )
}
