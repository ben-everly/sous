'use client'

import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { signInSchema, type SignInValues } from '@/lib/auth/schemas'
import { authErrorMessage } from '@/lib/auth/auth-errors'
import { isLoginError } from '@/lib/auth/login-errors'
import { AUTH_PATHS, withNext } from '@/lib/auth/routes'
import { sameOriginPath } from '@/lib/auth/same-origin-path'
import { useNavigatingSubmit } from '@/lib/hooks/use-navigating-submit'
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

export function EmailPasswordSignInForm({ next }: { next?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  })
  const { pending, startNavigating } = useNavigatingSubmit(form.formState.isSubmitting)

  const onValid = async (values: SignInValues) => {
    form.clearErrors('root')
    const { error } = await createClient().auth.signInWithPassword(values)
    if (error) {
      form.setError('root', { message: authErrorMessage(error) })
      // Land on the field so a correction is one keystroke away. The root banner is role="alert",
      // announced regardless of focus.
      form.setFocus('email')
      // A failed sign-in supersedes a page-arrival notice; drop it so it doesn't stack atop this error.
      if (isLoginError(searchParams.get('error'))) {
        router.replace(withNext(AUTH_PATHS.login, next))
      }
      return
    }
    // signInWithPassword resolves before the browser leaves the page — startNavigating holds
    // the spinner through the push/refresh so the button never re-enables mid-redirect.
    startNavigating()
    router.push(sameOriginPath(next))
    router.refresh()
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
                <Input type="email" autoComplete="email" autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Password</FormLabel>
                <Link
                  href={AUTH_PATHS.forgotPassword}
                  className="text-muted-foreground text-sm underline underline-offset-4"
                >
                  Forgot password?
                </Link>
              </div>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <SubmitButton pending={pending}>Sign in</SubmitButton>
        <FormRootError />
        {/* Gate on any failure, never on the error code: keying this to email_not_confirmed
            would reveal that the account exists but is unconfirmed. */}
        {form.formState.errors.root && (
          <p className="text-center text-sm">
            Just signed up? Confirm your email to finish.{' '}
            <Link href={AUTH_PATHS.resendConfirmation} className="underline underline-offset-4">
              Resend confirmation
            </Link>
            .
          </p>
        )}
      </form>
    </Form>
  )
}
