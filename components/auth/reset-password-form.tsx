'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { isAuthApiError, isAuthSessionMissingError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { verifyEmailToken } from '@/lib/auth/verify-email-token'
import { OTP_TYPES } from '@/lib/auth/otp-types'
import { backfillEmailIdentity } from '@/lib/actions/auth'
import { resetPasswordSchema, type ResetPasswordValues } from '@/lib/auth/schemas'
import { authErrorMessage } from '@/lib/auth/auth-errors'
import { RECOVERY_INVALID_URL } from '@/lib/auth/forgot-password-errors'
import { AUTH_PATHS } from '@/lib/auth/routes'
import { useNavigatingSubmit } from '@/lib/hooks/use-navigating-submit'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/submit-button'
import { Spinner } from '@/components/ui/spinner'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

type Status = 'verifying' | 'ready'

// A recovery session can die between verify and submit (revoked/reused refresh
// token, or an already-consumed link). Treat those like a missing session.
export const DEAD_SESSION_CODES = new Set([
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
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })
  const { pending, startNavigating } = useNavigatingSubmit(form.formState.isSubmitting)

  const verifyStarted = useRef(false)

  // The single-use token from the recovery email — not session presence — authorizes
  // the reset. verifyOtp consumes it into a recovery session. The ref guard keeps the
  // consuming call to once even under StrictMode's double-invoked effects (dev).
  useEffect(() => {
    if (verifyStarted.current) return
    verifyStarted.current = true
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    if (!tokenHash || type !== OTP_TYPES.recovery) {
      router.replace(RECOVERY_INVALID_URL)
      return
    }
    verifyEmailToken(createClient(), { tokenHash, type: OTP_TYPES.recovery })
      .then((result) => {
        if (!result.ok) router.replace(RECOVERY_INVALID_URL)
        else {
          // Drop the now-spent token from the URL so it doesn't linger in history.
          router.replace(AUTH_PATHS.resetPassword)
          setStatus('ready')
        }
      })
      .catch(() => router.replace(RECOVERY_INVALID_URL))
  }, [router, searchParams])

  const onValid = async (values: ResetPasswordValues) => {
    form.clearErrors('root')
    const { error } = await createClient().auth.updateUser({ password: values.password })
    if (error) {
      if (isDeadSessionError(error)) {
        router.replace(RECOVERY_INVALID_URL)
        return
      }
      form.setError('root', { message: authErrorMessage(error) })
      return
    }
    // Backfill the email identity for first-password users (e.g. Google-only; see
    // backfillEmailIdentity), then go home. A full navigation, not router.push: a Server
    // Action refreshes its caller route and would clobber a soft client navigation. The
    // backfill is best-effort and the password is already set, so never block the redirect.
    await backfillEmailIdentity().catch(() => {})
    startNavigating()
    window.location.assign('/')
  }

  if (status !== 'ready') {
    return <Spinner label="Verifying your reset link…" />
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onValid)} className="space-y-3" noValidate>
        {form.formState.errors.root && (
          <p role="alert" className="text-destructive text-center text-sm">
            {form.formState.errors.root.message}
          </p>
        )}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <SubmitButton pending={pending}>Update password</SubmitButton>
      </form>
    </Form>
  )
}
