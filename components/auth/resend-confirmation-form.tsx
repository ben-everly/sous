'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/lib/auth/schemas'
import { OTP_TYPES } from '@/lib/auth/otp-types'
import { AUTH_PATHS } from '@/lib/auth/routes'
import { ResendConfirmationButton } from './resend-confirmation-button'
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
    setSentTo(values.email)
  }

  if (sentTo) {
    return (
      <div className="space-y-3 text-center text-sm">
        <p role="status" className="text-muted-foreground">
          If an account for <span className="text-foreground font-medium">{sentTo}</span> still
          needs confirming, we&apos;ve sent a new link. Check your inbox and spam folder.
        </p>
        <ResendConfirmationButton email={sentTo} seedCooldown />
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
        <SubmitButton pending={form.formState.isSubmitting}>Resend confirmation email</SubmitButton>
      </form>
    </Form>
  )
}
