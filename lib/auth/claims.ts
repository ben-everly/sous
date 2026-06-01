import 'server-only'
import { createClient } from '@/lib/supabase/server'

// The proxy gates every (app) route, so no session here means a matcher slip,
// not a real state — fail loud instead of returning null or redirecting.
export async function requireClaims() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    throw new Error('requireClaims: no session on a gated route')
  }
  return data.claims
}
