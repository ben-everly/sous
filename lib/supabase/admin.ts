import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { env } from '@/lib/env'

// Service-role client — bypasses RLS, so it must never reach the browser ('server-only')
// and callers must resolve the acting user from their session, never from client input.
export function adminClient(): SupabaseClient<Database> {
  if (!env.SUPABASE_SECRET_KEY) throw new Error('SUPABASE_SECRET_KEY is not set')
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
