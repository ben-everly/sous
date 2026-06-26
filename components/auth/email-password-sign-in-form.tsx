'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { signInSchema } from '@/lib/auth/schemas'
import { authErrorMessage } from '@/lib/auth/auth-errors'
import { sameOriginPath } from '@/lib/auth/same-origin-path'
import { FormField } from '@/components/ui/form-field'
import { SubmitButton } from '@/components/ui/submit-button'

export function EmailPasswordSignInForm({ next }: { next?: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setFieldErrors({})
    const data = new FormData(event.currentTarget)
    const parsed = signInSchema.safeParse({
      email: String(data.get('email') ?? '').trim(),
      password: String(data.get('password') ?? ''),
    })
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors
      setFieldErrors({ email: fe.email?.[0], password: fe.password?.[0] })
      return
    }
    setPending(true)
    const { error } = await createClient().auth.signInWithPassword(parsed.data)
    if (error) {
      setError(authErrorMessage(error))
      setPending(false)
      return
    }
    // Leave pending set — push/refresh navigates away, so the spinner persists through it.
    router.push(sameOriginPath(next))
    router.refresh()
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
        autoComplete="current-password"
        error={fieldErrors.password}
      />
      <SubmitButton pending={pending}>Sign in</SubmitButton>
    </form>
  )
}
