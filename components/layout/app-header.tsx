import Link from 'next/link'
import type { AuthedUser } from '@/lib/auth/user'
import { UserMenu } from '@/components/layout/user-menu'

export function AppHeader({ user }: { user: AuthedUser }) {
  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-semibold tracking-tight">
          Sous
        </Link>
        <nav className="text-muted-foreground text-sm">
          <Link href="/plan" className="hover:text-foreground">
            Plan
          </Link>
        </nav>
      </div>
      <UserMenu user={user} />
    </header>
  )
}
