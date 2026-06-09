import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClaimsFrom } from '@/lib/auth/claims'
import { getUserFrom, type AuthedUser } from '@/lib/auth/user'
import { sameOriginPath } from '@/lib/auth/same-origin-path'

export async function requireAuthedUser(): Promise<AuthedUser> {
  const user = await getUserFrom(await createClient())
  if (!user) {
    console.error('auth backstop fired: proxy let an unauthenticated request through')
    // A proxy miss should reach login, not a 500.
    redirect('/login')
  }
  return user
}

export async function redirectIfAuthed(next?: string) {
  if (await getClaimsFrom(await createClient())) redirect(sameOriginPath(next))
}
