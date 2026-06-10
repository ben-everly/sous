import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { getClaimsFrom, type SessionClaims } from '@/lib/auth/claims'

type Profile = Pick<Database['public']['Tables']['profiles']['Row'], 'display_name' | 'avatar_url'>

// The signup trigger guarantees a profile row per authed user, so a read error is an anomaly.
export type AuthedUser = { claims: SessionClaims; profile: Profile | null; profileError: boolean }

export async function getUserFrom(supabase: SupabaseClient<Database>): Promise<AuthedUser | null> {
  const claims = await getClaimsFrom(supabase)
  if (!claims) return null

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', claims.sub)
    .maybeSingle()
  if (error) console.error('profile read failed:', error.message)

  return { claims, profile, profileError: Boolean(error) }
}
