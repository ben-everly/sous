'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { signUpSchema } from '@/lib/auth/schemas'
import { authErrorMessage } from '@/lib/auth/auth-errors'
import { sameOriginPath } from '@/lib/auth/same-origin-path'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type FieldErrors = { email?: string; password?: string; confirmPassword?: string }

export function RegisterForm({ next }: { next?: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

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
    })
    if (error) {
      setError(authErrorMessage(error))
      setPending(false)
      return
    }
    // GoTrue obfuscates an existing email as a user with no identities, independent of the
    // confirmations setting. Don't key off the null session alone: with confirmations on a
    // genuine new signup is also sessionless (its "check your inbox" UX is SIDE-135's job).
    if (result.user?.identities?.length === 0) {
      // Surface the same non-enumerating copy GoTrue's user_already_exists code maps to.
      setError(authErrorMessage({ code: 'user_already_exists' }))
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
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!fieldErrors.email}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
        />
        {fieldErrors.email && (
          <p id="email-error" role="alert" className="text-destructive text-sm">
            {fieldErrors.email}
          </p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!fieldErrors.password}
          aria-describedby={fieldErrors.password ? 'password-error' : undefined}
        />
        {fieldErrors.password && (
          <p id="password-error" role="alert" className="text-destructive text-sm">
            {fieldErrors.password}
          </p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirm password
        </label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!fieldErrors.confirmPassword}
          aria-describedby={fieldErrors.confirmPassword ? 'confirm-password-error' : undefined}
        />
        {fieldErrors.confirmPassword && (
          <p id="confirm-password-error" role="alert" className="text-destructive text-sm">
            {fieldErrors.confirmPassword}
          </p>
        )}
      </div>
      <Button type="submit" disabled={pending} aria-busy={pending} className="w-full">
        {pending && <LoaderCircle className="animate-spin" />}
        Create account
      </Button>
    </form>
  )
}
