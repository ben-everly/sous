import { requireAuthedUser } from '@/lib/auth/gate'
import { Providers } from './providers'
import { AppHeader } from '@/components/layout/app-header'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuthedUser()

  return (
    <Providers key={user.claims.sub} userId={user.claims.sub}>
      <AppHeader user={user} />
      {children}
    </Providers>
  )
}
