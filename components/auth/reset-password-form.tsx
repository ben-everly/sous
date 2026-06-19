'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle } from 'lucide-react'
import { isAuthApiError, isAuthSessionMissingError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { resetPasswordSchema } from '@/lib/auth/schemas'
import { authErrorMessage } from '@/lib/auth/auth-errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type FieldErrors = { password?: string; confirmPassword?: string }

// A recovery session can die between page load and submit (revoked/reused refresh token,
// or an already-consumed link). Treat those like a missing session: bounce to request a new one.
const DEAD_SESSION_CODES = new Set([
  'session_expired',
  'session_not_found',
  'refresh_token_not_found',
  'refresh_token_already_used',
])

export function ResetPasswordForm() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  // This gate is UX only — updateUser below is authorized by the recovery session at
  // GoTrue, which is the real boundary. The recovery code was already exchanged into a
  // session by /auth/callback; no session here means a direct hit or an expired/used link.
  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (!data.session) router.replace('/forgot-password?error=recovery_invalid')
        else setReady(true)
      })
      .catch(() => router.replace('/forgot-password?error=recovery_invalid'))
  }, [router])

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setFieldErrors({})
    const data = new FormData(event.currentTarget)
    const parsed = resetPasswordSchema.safeParse({
      password: String(data.get('password') ?? ''),
      confirmPassword: String(data.get('confirmPassword') ?? ''),
    })
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors
      setFieldErrors({ password: fe.password?.[0], confirmPassword: fe.confirmPassword?.[0] })
      return
    }
    setPending(true)
    const { error } = await createClient().auth.updateUser({ password: parsed.data.password })
    if (error) {
      if (
        isAuthSessionMissingError(error) ||
        (isAuthApiError(error) && DEAD_SESSION_CODES.has(error.code ?? ''))
      ) {
        router.replace('/forgot-password?error=recovery_invalid')
        return
      }
      setError(authErrorMessage(error))
      setPending(false)
      return
    }
    router.push('/')
    router.refresh()
  }

  if (!ready) {
    return (
      <p role="status" className="text-muted-foreground flex justify-center">
        <LoaderCircle className="animate-spin" />
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
        <label htmlFor="password" className="text-sm font-medium">
          New password
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
          <p id="password-error" className="text-destructive text-sm">
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
          <p id="confirm-password-error" className="text-destructive text-sm">
            {fieldErrors.confirmPassword}
          </p>
        )}
      </div>
      <Button type="submit" disabled={pending} aria-busy={pending} className="w-full">
        {pending && <LoaderCircle className="animate-spin" />}
        Update password
      </Button>
    </form>
  )
}
