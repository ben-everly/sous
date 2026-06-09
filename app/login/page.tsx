import { redirect } from 'next/navigation'
import { getClaims } from '@/lib/auth/server-claims'
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button'
import { isLoginError, loginError } from '@/lib/auth/login-errors'
import { sameOriginPath } from '@/lib/auth/same-origin-path'
import { cn } from '@/lib/utils'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const { error, next } = await searchParams
  if (await getClaims()) redirect(sameOriginPath(next))

  const notice = isLoginError(error) ? loginError(error) : null

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Sign in to Sous</h1>
          <p className="text-muted-foreground text-sm">
            Manage your kitchen inventory, recipes, and meal plans.
          </p>
        </div>
        {notice && (
          <p
            role={notice.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'text-center text-sm',
              notice.tone === 'error' ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {notice.message}
          </p>
        )}
        {/* TODO(launch): data disclosure + privacy policy link go here once a policy exists. */}
        {/* TODO(launch): offer an email/password sign-in option — Google is the only path for v1. */}
        <GoogleSignInButton next={next} />
      </div>
    </main>
  )
}
