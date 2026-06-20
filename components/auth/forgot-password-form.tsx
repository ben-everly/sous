'use client'

import { useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { forgotPasswordSchema } from '@/lib/auth/schemas'
import { authErrorMessage } from '@/lib/auth/auth-errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

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
    // Reuses the existing /auth/callback route to exchange the recovery code,
    // which then redirects to /reset-password.
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`
    const { error } = await createClient().auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo,
    })
    setPending(false)
    if (error) {
      setError(authErrorMessage(error))
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <p role="status" className="text-muted-foreground text-center text-sm">
        If an account exists for that email, we&apos;ve sent a password-reset link. Check your
        inbox.
      </p>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      {error && (
        <p role="alert" className="text-destructive text-center text-sm">
          {error}
        </p>
      )}
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
        Send reset link
      </Button>
    </form>
  )
}
