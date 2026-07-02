import { redirectIfAuthed } from '@/lib/auth/gate'
import { RegisterForm } from '@/components/auth/register-form'
import { AUTH_PATHS, withNext } from '@/lib/auth/routes'

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  await redirectIfAuthed(next)

  const loginHref = withNext(AUTH_PATHS.login, next)

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <RegisterForm loginHref={loginHref} />
    </main>
  )
}
