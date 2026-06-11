import { requireAuthedUser } from '@/lib/auth/gate'
import { AppHeader } from '@/components/layout/app-header'
import { Toaster } from '@/components/ui/sonner'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuthedUser()

  return (
    <>
      <AppHeader user={user} />
      {children}
      <Toaster />
    </>
  )
}
