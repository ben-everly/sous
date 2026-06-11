import { redirectIfAuthed } from '@/lib/auth/gate'
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button'
import { LoginNotice } from '@/components/auth/login-notice'
import { isLoginError } from '@/lib/auth/login-errors'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const { error, next } = await searchParams
  await redirectIfAuthed(next)

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
        {/* TODO(launch): data disclosure + privacy policy link go here once a policy exists. */}
        {/* TODO(launch): offer an email/password sign-in option — Google is the only path for v1. */}
        <GoogleSignInButton next={next} />
      </div>
    </main>
  )
}
