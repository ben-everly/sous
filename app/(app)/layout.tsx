import { redirect } from 'next/navigation'
import { getClaims } from '@/lib/auth/claims'
import { AppHeader } from '@/components/layout/app-header'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const claims = await getClaims()
  if (!claims) redirect('/login')

  return (
    <>
      <AppHeader claims={claims} />
      {children}
    </>
  )
}
