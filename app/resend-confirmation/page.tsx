import { redirectIfAuthed } from '@/lib/auth/gate'
import { ResendConfirmationForm } from '@/components/auth/resend-confirmation-form'

export default async function ResendConfirmationPage() {
  await redirectIfAuthed()

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <ResendConfirmationForm />
    </main>
  )
}
