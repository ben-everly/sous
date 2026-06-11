import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Fail secure: a thrown or errored getClaims counts as no session.
export async function getClaimsFrom(supabase: SupabaseClient<Database>) {
  return supabase.auth
    .getClaims()
    .then(({ data, error }) => (error ? null : (data?.claims ?? null)))
    .catch(() => null)
}

export type SessionClaims = NonNullable<Awaited<ReturnType<typeof getClaimsFrom>>>
