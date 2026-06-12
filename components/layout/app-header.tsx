import type { AuthedUser } from '@/lib/auth/user'
import { UserMenu } from '@/components/layout/user-menu'

export function AppHeader({ user }: { user: AuthedUser }) {
  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <span className="font-semibold tracking-tight">Sous</span>
      <UserMenu user={user} />
    </header>
  )
}
