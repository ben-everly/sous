import { User } from 'lucide-react'
import type { AuthedUser } from '@/lib/auth/user'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SignOutButton } from '@/components/auth/sign-out-button'

export function AppHeader({ user }: { user: AuthedUser }) {
  const name = user.profile?.display_name

  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <span className="font-semibold tracking-tight">Sous</span>
      <div className="flex items-center gap-3">
        <Avatar>
          {/* TODO(launch): hotlinking Google's CDN leaks IP/timing to Google (no-referrer
              hides only the page URL) — copy avatars into Storage; also fixes URL expiry. */}
          {user.profile?.avatar_url && (
            <AvatarImage
              src={user.profile.avatar_url}
              alt={name ?? 'Your profile'}
              referrerPolicy="no-referrer"
            />
          )}
          <AvatarFallback>
            <User className="size-4" aria-hidden="true" />
          </AvatarFallback>
        </Avatar>
        {name && <span className="text-sm font-medium">{name}</span>}
        {/* TODO(launch): account menu here — data export + delete account (profiles ON DELETE
            CASCADE already makes deletion cheap). */}
        <SignOutButton />
      </div>
    </header>
  )
}
