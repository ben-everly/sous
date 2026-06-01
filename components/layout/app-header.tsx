import { createClient } from '@/lib/supabase/server'
import { requireClaims } from '@/lib/auth/claims'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SignOutButton } from '@/components/auth/sign-out-button'

function initialsFrom(tokens: string[]): string {
  return tokens
    .filter(Boolean)
    .slice(0, 2)
    .map((t) => t[0]!.toUpperCase())
    .join('')
}

export async function AppHeader() {
  const claims = await requireClaims()
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', claims.sub)
    .maybeSingle()

  // Email is always present; both profile columns are nullable.
  const emailLocalPart = (claims.email ?? '').split('@')[0]
  const name = profile?.display_name ?? emailLocalPart
  const initials = profile?.display_name
    ? initialsFrom(profile.display_name.split(/\s+/))
    : initialsFrom(emailLocalPart.split(/[._+-]+/))

  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <span className="font-semibold tracking-tight">Sous</span>
      <div className="flex items-center gap-3">
        <Avatar>
          {profile?.avatar_url && (
            <AvatarImage src={profile.avatar_url} alt={name} referrerPolicy="no-referrer" />
          )}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium">{name}</span>
        <SignOutButton />
      </div>
    </header>
  )
}
