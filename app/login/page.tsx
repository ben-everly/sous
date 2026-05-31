import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button'
import { isLoginError, loginErrorMessage } from '@/lib/auth/login-errors'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect('/')

  const { error } = await searchParams
  const message = isLoginError(error) ? loginErrorMessage(error) : null

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Sign in to Sous</h1>
          <p className="text-muted-foreground text-sm">
            Manage your kitchen inventory, recipes, and meal plans.
          </p>
        </div>
        {message && (
          <p role="alert" className="text-destructive text-center text-sm">
            {message}
          </p>
        )}
        <GoogleSignInButton />
      </div>
    </main>
  )
}
