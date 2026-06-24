'use client'

import { useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { forgotPasswordSchema } from '@/lib/auth/schemas'
import { OTP_TYPES } from '@/lib/auth/otp-types'
import { AUTH_PATHS } from '@/lib/auth/routes'
import { ResendConfirmationButton } from './resend-confirmation-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ResendConfirmationForm() {
  const [pending, setPending] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFieldError(null)
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim()
    const parsed = forgotPasswordSchema.safeParse({ email })
    if (!parsed.success) {
      setFieldError(parsed.error.flatten().fieldErrors.email?.[0] ?? null)
      return
    }
    setPending(true)
    // Fire and ignore the result: a non-enumerating affordance must respond identically
    // whether or not the address has an unconfirmed account (GoTrue's resend is built for this).
    await createClient()
      .auth.resend({
        type: OTP_TYPES.signup,
        email: parsed.data.email,
        options: { emailRedirectTo: `${window.location.origin}${AUTH_PATHS.confirm}` },
      })
      .catch(() => {})
    setPending(false)
    setSentTo(parsed.data.email)
  }

  if (sentTo) {
    return (
      <div className="space-y-3 text-center text-sm">
        <p role="status" className="text-muted-foreground">
          If an account for <span className="text-foreground font-medium">{sentTo}</span> still
          needs confirming, we&apos;ve sent a new link. Check your inbox and spam folder.
        </p>
        <ResendConfirmationButton email={sentTo} seedCooldown />
        <button
          type="button"
          onClick={() => setSentTo(null)}
          className="underline underline-offset-4"
        >
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!fieldError}
          aria-describedby={fieldError ? 'email-error' : undefined}
        />
        {fieldError && (
          <p id="email-error" role="alert" className="text-destructive text-sm">
            {fieldError}
          </p>
        )}
      </div>
      <Button type="submit" disabled={pending} aria-busy={pending} className="w-full">
        {pending && <LoaderCircle className="animate-spin" />}
        Resend confirmation email
      </Button>
    </form>
  )
}
