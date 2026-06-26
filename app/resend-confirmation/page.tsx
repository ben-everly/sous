import Link from 'next/link'
import { redirectIfAuthed } from '@/lib/auth/gate'
import { ResendConfirmationForm } from '@/components/auth/resend-confirmation-form'
import { AUTH_PATHS } from '@/lib/auth/routes'

export default async function ResendConfirmationPage() {
  await redirectIfAuthed()

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Resend confirmation</h1>
          <p className="text-muted-foreground text-sm">
            Enter your email and we&apos;ll send a new confirmation link.
          </p>
        </div>
        <ResendConfirmationForm />
        <p className="text-center text-sm">
          <Link href={AUTH_PATHS.login} className="underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
