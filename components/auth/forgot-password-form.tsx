'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { forgotPasswordSchema } from '@/lib/auth/schemas'
import { authErrorMessage } from '@/lib/auth/auth-errors'
import { AUTH_PATHS } from '@/lib/auth/routes'
import { FormField } from '@/components/ui/form-field'
import { SubmitButton } from '@/components/ui/submit-button'

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setFieldError(null)
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim()
    const parsed = forgotPasswordSchema.safeParse({ email })
    if (!parsed.success) {
      setFieldError(parsed.error.flatten().fieldErrors.email?.[0] ?? null)
      return
    }
    setPending(true)
    // Recovery links land directly on /reset-password, which verifies the
    // single-use token from the URL (see the recovery email template).
    const redirectTo = `${window.location.origin}${AUTH_PATHS.resetPassword}`
    const { error } = await createClient().auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo,
    })
    setPending(false)
    if (error) {
      setError(authErrorMessage(error))
      return
    }
    setSentTo(parsed.data.email)
  }

  if (sentTo) {
    return (
      <div className="space-y-3 text-center text-sm">
        <p role="status" className="text-muted-foreground">
          If an account exists for <span className="text-foreground font-medium">{sentTo}</span>,
          we&apos;ve sent a password-reset link. Check your inbox.
        </p>
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
      {error && (
        <p role="alert" className="text-destructive text-center text-sm">
          {error}
        </p>
      )}
      <FormField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        error={fieldError ?? undefined}
      />
      <SubmitButton pending={pending}>Send reset link</SubmitButton>
    </form>
  )
}
