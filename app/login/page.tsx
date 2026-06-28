import Link from 'next/link'
import { redirectIfAuthed } from '@/lib/auth/gate'
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button'
import { EmailPasswordSignInForm } from '@/components/auth/email-password-sign-in-form'
import { LoginNotice } from '@/components/auth/login-notice'
import { isLoginError } from '@/lib/auth/login-errors'
import { AUTH_PATHS, withNext } from '@/lib/auth/routes'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const { error, next } = await searchParams
  await redirectIfAuthed(next)

  const registerHref = withNext(AUTH_PATHS.register, next)

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Sign in to Sous</h1>
          <p className="text-muted-foreground text-sm">
            Manage your kitchen inventory, recipes, and meal plans.
          </p>
        </div>
        {isLoginError(error) && <LoginNotice error={error} />}
        <GoogleSignInButton next={next} />
        <div className="text-muted-foreground flex items-center gap-3 text-xs">
          <span className="bg-border h-px flex-1" />
          OR
          <span className="bg-border h-px flex-1" />
        </div>
        <EmailPasswordSignInForm next={next} />
        <p className="text-center text-sm">
          <Link href={registerHref} className="underline underline-offset-4">
            Create account
          </Link>
        </p>
      </div>
    </main>
  )
}
