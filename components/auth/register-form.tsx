'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { signUpSchema, MIN_PASSWORD_LENGTH, type SignUpValues } from '@/lib/auth/schemas'
import { authErrorMessage } from '@/lib/auth/auth-errors'
import { classifySignupResult } from '@/lib/auth/signup'
import { AUTH_PATHS } from '@/lib/auth/routes'
import { useNavigatingSubmit } from '@/lib/hooks/use-navigating-submit'
import { ConfirmationSent } from '@/components/auth/confirmation-sent'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/submit-button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { FormRootError } from '@/components/ui/form-root-error'

export function RegisterForm({ loginHref }: { loginHref: string }) {
  const router = useRouter()
  const [sentTo, setSentTo] = useState<string | null>(null)
  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  })
  const { pending, startNavigating } = useNavigatingSubmit(form.formState.isSubmitting)

  const onValid = async (values: SignUpValues) => {
    form.clearErrors('root')
    const { data: result, error } = await createClient().auth.signUp({
      email: values.email,
      password: values.password,
      options: { emailRedirectTo: `${window.location.origin}${AUTH_PATHS.confirm}` },
    })
    if (error) {
      form.setError('root', { message: authErrorMessage(error) })
      return
    }
    switch (classifySignupResult(result)) {
      case 'existing':
        form.setError('root', { message: authErrorMessage({ code: 'user_already_exists' }) })
        return
      case 'authed':
        // Confirmation lands the user home too, so signup carries no post-auth `next`.
        startNavigating()
        router.push('/')
        router.refresh()
        return
      case 'awaiting_confirmation':
        setSentTo(values.email)
        return
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      {sentTo ? (
        <ConfirmationSent
          email={sentTo}
          loginHref={loginHref}
          onUseDifferentEmail={() => {
            // Backing out is a fresh start, not an edit of the just-sent address.
            setSentTo(null)
            form.reset()
          }}
        >
          We&apos;ve sent a confirmation link to{' '}
          <span className="text-foreground font-medium">{sentTo}</span>. It can take up to a minute.
          Check spam if you don&apos;t see it.
        </ConfirmationSent>
      ) : (
        <>
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
            <p className="text-muted-foreground text-sm">Start managing your kitchen with Sous.</p>
          </div>
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
              <FormField
                control={form.control}
                name="password"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    {/* the error restates the rule, so keep the hint only for screen
                      readers (still in aria-describedby) */}
                    <FormDescription className={fieldState.error ? 'sr-only' : undefined}>
                      Must be at least {MIN_PASSWORD_LENGTH} characters.
                    </FormDescription>
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
              <SubmitButton pending={pending}>Create account</SubmitButton>
            </form>
          </Form>
          <div className="text-muted-foreground space-y-1 text-center text-sm">
            <p>
              Already have an account?{' '}
              <Link href={loginHref} className="text-foreground underline underline-offset-4">
                Sign in
              </Link>
            </p>
            <p>
              <Link
                href={AUTH_PATHS.forgotPassword}
                className="text-foreground underline underline-offset-4"
              >
                Forgot password?
              </Link>
            </p>
          </div>
        </>
      )}
    </div>
  )
}
