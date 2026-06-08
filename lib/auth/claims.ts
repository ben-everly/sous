import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export const getClaims = cache(async () => {
  const supabase = await createClient()
  return supabase.auth
    .getClaims()
    .then(({ data, error }) => (error ? null : (data?.claims ?? null)))
    .catch(() => null)
})

export type SessionClaims = NonNullable<Awaited<ReturnType<typeof getClaims>>>
