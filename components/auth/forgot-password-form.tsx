'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/lib/auth/schemas'
import { authErrorMessage } from '@/lib/auth/auth-errors'
import { markResendSent } from '@/lib/auth/resend-cooldown'
import { AUTH_PATHS } from '@/lib/auth/routes'
import type { ForgotPasswordError } from '@/lib/auth/forgot-password-errors'
import { CheckYourInbox } from '@/components/auth/check-your-inbox'
import { LoginNotice } from '@/components/auth/login-notice'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/submit-button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { FormRootError } from '@/components/ui/form-root-error'

// Recovery must land on /reset-password (it verifies the token), never the OAuth /auth/callback.
const recoveryRedirectTo = () => `${window.location.origin}${AUTH_PATHS.resetPassword}`

export function ForgotPasswordForm({ error }: { error?: ForgotPasswordError }) {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onValid = async (values: ForgotPasswordValues) => {
    form.clearErrors('root')
    const { error } = await createClient().auth.resetPasswordForEmail(values.email, {
      redirectTo: recoveryRedirectTo(),
    })
    if (error) {
      form.setError('root', { message: authErrorMessage(error) })
      return
    }
    markResendSent(values.email)
    setSentTo(values.email)
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      {sentTo ? (
        <CheckYourInbox
          email={sentTo}
          loginHref={AUTH_PATHS.login}
          onUseDifferentEmail={() => {
            setSentTo(null)
            form.reset()
          }}
          resend={() =>
            createClient().auth.resetPasswordForEmail(sentTo, { redirectTo: recoveryRedirectTo() })
          }
          resendLabel="Resend reset link"
          resendSuccessMessage="Reset link sent."
        >
          If an account exists for <span className="text-foreground font-medium">{sentTo}</span>,
          we&apos;ve sent a password-reset link. Check your inbox.
        </CheckYourInbox>
      ) : (
        <>
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
            <p className="text-muted-foreground text-sm">
              Enter your email and we&apos;ll send a reset link.
            </p>
          </div>
          {error && <LoginNotice error={error} />}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onValid)} className="space-y-3" noValidate>
              <FormRootError />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <SubmitButton pending={form.formState.isSubmitting}>Send reset link</SubmitButton>
            </form>
          </Form>
          <p className="text-center text-sm">
            <Link href={AUTH_PATHS.login} className="text-foreground underline underline-offset-4">
              Back to sign in
            </Link>
          </p>
        </>
      )}
    </div>
  )
}
