'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { signInSchema, type SignInValues } from '@/lib/auth/schemas'
import { authErrorMessage } from '@/lib/auth/auth-errors'
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
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <SubmitButton pending={pending}>Sign in</SubmitButton>
      </form>
    </Form>
  )
}
