import Link from 'next/link'
import { redirectIfAuthed } from '@/lib/auth/gate'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { LoginNotice } from '@/components/auth/login-notice'
import { isForgotPasswordError } from '@/lib/auth/forgot-password-errors'
import { AUTH_PATHS } from '@/lib/auth/routes'

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  await redirectIfAuthed()

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
          <p className="text-muted-foreground text-sm">
            Enter your email and we&apos;ll send a reset link.
          </p>
        </div>
        {isForgotPasswordError(error) && <LoginNotice error={error} />}
        <ForgotPasswordForm />
        <p className="text-center text-sm">
          <Link href={AUTH_PATHS.login} className="underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
