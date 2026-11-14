import { requireAuthedUser } from '@/lib/auth/gate'
import { Providers } from './providers'
import { AppHeader } from '@/components/layout/app-header'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuthedUser()

  return (
    <Providers>
      <AppHeader user={user} />
      {children}
    </Providers>
  )
}
