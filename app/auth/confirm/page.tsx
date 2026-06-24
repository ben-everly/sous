import { Suspense } from 'react'
import { LoaderCircle } from 'lucide-react'
import { ConfirmEmail } from '@/components/auth/confirm-email'

// A page, not a route handler: ConfirmEmail consumes the single-use token client-side so a
// mail scanner's prefetch GET can't burn it before the user clicks (see ConfirmEmail).
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
        <Suspense
          fallback={
            <p role="status" className="text-muted-foreground flex justify-center">
              <LoaderCircle className="animate-spin" />
            </p>
          }
        >
          <ConfirmEmail />
        </Suspense>
      </div>
    </main>
  )
}
