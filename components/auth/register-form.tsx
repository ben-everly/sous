'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { signUpSchema } from '@/lib/auth/schemas'
import { authErrorMessage } from '@/lib/auth/auth-errors'
import { classifySignupResult } from '@/lib/auth/signup'
import { AUTH_PATHS } from '@/lib/auth/routes'
import { CheckInbox } from '@/components/auth/check-inbox'
import { FormField } from '@/components/ui/form-field'
import { SubmitButton } from '@/components/ui/submit-button'

type FieldErrors = { email?: string; password?: string; confirmPassword?: string }

export function RegisterForm() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [sentTo, setSentTo] = useState<string | null>(null)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setFieldErrors({})
    const data = new FormData(event.currentTarget)
    const parsed = signUpSchema.safeParse({
      email: String(data.get('email') ?? '').trim(),
      password: String(data.get('password') ?? ''),
      confirmPassword: String(data.get('confirmPassword') ?? ''),
    })
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors
      setFieldErrors({
        email: fe.email?.[0],
        password: fe.password?.[0],
        confirmPassword: fe.confirmPassword?.[0],
      })
      return
    }
    setPending(true)
    const { data: result, error } = await createClient().auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { emailRedirectTo: `${window.location.origin}${AUTH_PATHS.confirm}` },
    })
    if (error) {
      setError(authErrorMessage(error))
      setPending(false)
      return
    }
    switch (classifySignupResult(result)) {
      case 'existing':
        setError(authErrorMessage({ code: 'user_already_exists' }))
        setPending(false)
        return
      case 'authed':
        // Confirmation lands the user home too, so signup carries no post-auth `next`
        // (see /reset-password). Leave pending set — push/refresh navigates away.
        router.push('/')
        router.refresh()
        return
      case 'awaiting_confirmation':
        setPending(false)
        setSentTo(parsed.data.email)
        return
    }
  }

  if (sentTo) {
    return (
      <CheckInbox
        email={sentTo}
        onUseDifferentEmail={() => {
          setSentTo(null)
          setError(null)
        }}
      />
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
        error={fieldErrors.email}
      />
      <FormField
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        error={fieldErrors.password}
      />
      <FormField
        name="confirmPassword"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        error={fieldErrors.confirmPassword}
      />
      <SubmitButton pending={pending}>Create account</SubmitButton>
    </form>
  )
}
