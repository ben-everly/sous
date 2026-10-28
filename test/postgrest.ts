import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Builders never send a request until awaited, so any URL works.
export const builderClient = () => createClient<Database>('http://localhost', 'anon')

// PostgrestBuilder's url is only protected in its types; it holds the request the builder would send.
export const searchParams = (query: unknown) => (query as { url: URL }).url.searchParams
