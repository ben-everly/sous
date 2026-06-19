import Link from 'next/link'
import { redirectIfAuthed } from '@/lib/auth/gate'
import { RegisterForm } from '@/components/auth/register-form'

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  await redirectIfAuthed(next)

  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : '/login'

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
          <p className="text-muted-foreground text-sm">Start managing your kitchen with Sous.</p>
        </div>
        <RegisterForm next={next} />
        <p className="text-center text-sm">
          Already have an account?{' '}
          <Link href={loginHref} className="underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
