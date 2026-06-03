import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export const requireClaims = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    throw new Error('requireClaims: no session on a gated route')
  }
  return data.claims
})
