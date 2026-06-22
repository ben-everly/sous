'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoaderCircle } from 'lucide-react'
import { isAuthApiError, isAuthSessionMissingError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { resetPasswordSchema } from '@/lib/auth/schemas'
import { authErrorMessage } from '@/lib/auth/auth-errors'
import { RECOVERY_INVALID_URL } from '@/lib/auth/forgot-password-errors'
import { AUTH_PATHS } from '@/lib/auth/routes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type FieldErrors = { password?: string; confirmPassword?: string }
type Status = 'verifying' | 'ready'

// A recovery session can die between verify and submit (revoked/reused refresh
// token, or an already-consumed link). Treat those like a missing session.
const DEAD_SESSION_CODES = new Set([
  'session_expired',
  'session_not_found',
  'refresh_token_not_found',
  'refresh_token_already_used',
])

function isDeadSessionError(error: unknown): boolean {
  return (
    isAuthSessionMissingError(error) ||
    (isAuthApiError(error) && DEAD_SESSION_CODES.has(error.code ?? ''))
  )
}

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<Status>('verifying')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const verifyStarted = useRef(false)

  // The single-use token from the recovery email — not session presence — authorizes
  // the reset. verifyOtp consumes it into a recovery session. The ref guard keeps the
  // consuming call to once even under StrictMode's double-invoked effects (dev).
  useEffect(() => {
    if (verifyStarted.current) return
    verifyStarted.current = true
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    if (!tokenHash || type !== 'recovery') {
      router.replace(RECOVERY_INVALID_URL)
      return
    }
    createClient()
      .auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
      .then(({ error }) => {
        if (error) router.replace(RECOVERY_INVALID_URL)
        else {
          // Drop the now-spent token from the URL so it doesn't linger in history.
          router.replace(AUTH_PATHS.resetPassword)
          setStatus('ready')
        }
      })
      .catch(() => router.replace(RECOVERY_INVALID_URL))
  }, [router, searchParams])

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
      if (isDeadSessionError(error)) {
        router.replace(RECOVERY_INVALID_URL)
        return
      }
      setError(authErrorMessage(error))
      setPending(false)
      return
    }
    router.push('/')
    router.refresh()
  }

  if (status !== 'ready') {
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
        Update password
      </Button>
    </form>
  )
}
