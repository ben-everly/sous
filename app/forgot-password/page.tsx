import { redirectIfAuthed } from '@/lib/auth/gate'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { isForgotPasswordError } from '@/lib/auth/forgot-password-errors'

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  await redirectIfAuthed()

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <ForgotPasswordForm error={isForgotPasswordError(error) ? error : undefined} />
    </main>
  )
}
