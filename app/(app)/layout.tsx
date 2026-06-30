import { requireAuthedUser } from '@/lib/auth/gate'
import { AppHeader } from '@/components/layout/app-header'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuthedUser()

  return (
    <>
      <AppHeader user={user} />
      {children}
    </>
  )
}
