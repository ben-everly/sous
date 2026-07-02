'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/lib/auth/schemas'
import { OTP_TYPES } from '@/lib/auth/otp-types'
import { AUTH_PATHS } from '@/lib/auth/routes'
import { useResendCooldown } from '@/lib/hooks/use-resend-cooldown'
import { ConfirmationSent } from '@/components/auth/confirmation-sent'
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

export function ResendConfirmationForm() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })
  // Guard the submit by the email currently typed, so backing out and resubmitting the same
  // address respects the cooldown instead of firing a send GoTrue would throttle.
  const email = useWatch({ control: form.control, name: 'email' })
  const { cooling, secondsLeft, markSent } = useResendCooldown(email)

  const onValid = async (values: ForgotPasswordValues) => {
    // Fire and ignore the result: a non-enumerating affordance must respond identically
    // whether or not the address has an unconfirmed account (GoTrue's resend is built for this).
    await createClient()
      .auth.resend({
        type: OTP_TYPES.signup,
        email: values.email,
        options: { emailRedirectTo: `${window.location.origin}${AUTH_PATHS.confirm}` },
      })
      .catch(() => {})
    // Mark unconditionally (the result was ignored above): a per-outcome cooldown would leak
    // whether the address had an account, defeating the non-enumeration this form exists for.
    markSent()
    setSentTo(values.email)
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      {sentTo ? (
        <ConfirmationSent
          email={sentTo}
          loginHref={AUTH_PATHS.login}
          onUseDifferentEmail={() => setSentTo(null)}
        >
          If an account for <span className="text-foreground font-medium">{sentTo}</span> still
          needs confirming, we&apos;ve sent a new link. Check your inbox and spam folder.
        </ConfirmationSent>
      ) : (
        <>
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight">Resend confirmation</h1>
            <p className="text-muted-foreground text-sm">
              Enter your email and we&apos;ll send a new confirmation link.
            </p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onValid)} className="space-y-3" noValidate>
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
              <SubmitButton pending={form.formState.isSubmitting} disabled={cooling}>
                {cooling ? `Resend available in ${secondsLeft}s` : 'Resend confirmation email'}
              </SubmitButton>
            </form>
          </Form>
          <p className="text-center text-sm">
            <Link href={AUTH_PATHS.login} className="underline underline-offset-4">
              Back to sign in
            </Link>
          </p>
        </>
      )}
    </div>
  )
}
