import { Suspense } from 'react'
import { ConfirmEmail } from '@/components/auth/confirm-email'
import { Spinner } from '@/components/ui/spinner'

// A page, not a route handler, so the token is consumed client-side — see ConfirmEmail for why.
export default function ConfirmEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Confirming your email</h1>
          <p className="text-muted-foreground text-sm">
            Just a moment while we finish setting up your account.
          </p>
        </div>
        <Suspense fallback={<Spinner />}>
          <ConfirmEmail />
        </Suspense>
      </div>
    </main>
  )
}
