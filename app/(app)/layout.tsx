import { redirect } from 'next/navigation'
import { getClaims } from '@/lib/auth/claims'
import { AppHeader } from '@/components/layout/app-header'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // The proxy already gated this route — a null here means its matcher slipped.
  // Log loud, but still redirect: users get the login page, not a 500.
  const claims = await getClaims()
  if (!claims) {
    console.error('auth backstop fired: proxy let an unauthenticated request through')
    redirect('/login')
  }

  return (
    <>
      <AppHeader claims={claims} />
      {children}
    </>
  )
}
