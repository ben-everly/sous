import { User } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { SessionClaims } from '@/lib/auth/claims'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SignOutButton } from '@/components/auth/sign-out-button'

export async function AppHeader({ claims }: { claims: SessionClaims }) {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', claims.sub)
    .maybeSingle()

  const name = profile?.display_name ?? (claims.email ?? '').split('@')[0]

  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <span className="font-semibold tracking-tight">Sous</span>
      <div className="flex items-center gap-3">
        <Avatar>
          {profile?.avatar_url && (
            <AvatarImage src={profile.avatar_url} alt={name} referrerPolicy="no-referrer" />
          )}
          <AvatarFallback>
            <User className="size-4" aria-hidden="true" />
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium">{name}</span>
        <SignOutButton />
      </div>
    </header>
  )
}
