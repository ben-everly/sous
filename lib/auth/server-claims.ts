import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getClaimsFrom } from '@/lib/auth/claims'

export const getClaims = cache(async () => getClaimsFrom(await createClient()))
