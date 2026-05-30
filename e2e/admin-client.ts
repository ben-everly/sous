import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

/**
 * Service-role Supabase client for E2E seeding — the ONLY place the service-role
 * key is used. Guard rails make it impossible to point anywhere but a local
 * Supabase: a misconfigured CI must never seed a real project.
 */
export function adminClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  const { hostname } = new URL(url)
  if (hostname !== '127.0.0.1' && hostname !== 'localhost') {
    throw new Error(`Refusing to seed a non-local Supabase host: ${hostname}`)
  }
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!secret) throw new Error('SUPABASE_SECRET_KEY is not set')
  return createClient<Database>(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
