'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/lib/auth/schemas'
import { authErrorMessage } from '@/lib/auth/auth-errors'
import { AUTH_PATHS } from '@/lib/auth/routes'
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

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onValid = async (values: ForgotPasswordValues) => {
    form.clearErrors('root')
    // Recovery links land directly on /reset-password, which verifies the
    // single-use token from the URL (see the recovery email template).
    const redirectTo = `${window.location.origin}${AUTH_PATHS.resetPassword}`
    const { error } = await createClient().auth.resetPasswordForEmail(values.email, { redirectTo })
    if (error) {
      form.setError('root', { message: authErrorMessage(error) })
      return
    }
    setSentTo(values.email)
  }

  if (sentTo) {
    return (
      <div className="space-y-3 text-center text-sm">
        <p role="status" className="text-muted-foreground">
          If an account exists for <span className="text-foreground font-medium">{sentTo}</span>,
          we&apos;ve sent a password-reset link. Check your inbox.
        </p>
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
        {form.formState.errors.root && (
          <p role="alert" className="text-destructive text-center text-sm">
            {form.formState.errors.root.message}
          </p>
        )}
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
  )
}
