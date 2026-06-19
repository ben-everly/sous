import { ResetPasswordForm } from '@/components/auth/reset-password-form'

// No redirectIfAuthed: the recovery session is authed, and bouncing it would
// break the reset. ResetPasswordForm handles the no-session case itself.
export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Set a new password</h1>
          <p className="text-muted-foreground text-sm">Choose a new password for your account.</p>
        </div>
        <ResetPasswordForm />
      </div>
    </main>
  )
}
