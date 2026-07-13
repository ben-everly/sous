import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { Kitchen } from './types'

type Client = SupabaseClient<Database>

export const COLUMNS = 'id, name, created_at, deleted_at'

// Every kitchen the owner has, live and trashed, as a PostgREST query builder (not an awaited
// promise): the client data layer derives its cache key from the builder and re-runs it to refetch.
// The hook partitions the one result by deleted_at, so the live list, the trash, and the trash count
// all come from a single read with no separate count query to race. Tiebreak on id for a total order.
export function allKitchensQuery(supabase: Client) {
  return supabase.from('kitchens').select(COLUMNS).order('created_at').order('id')
}

// security-invoker RPC: RLS scopes the update to the owner; the deleted_at guard makes a wrong-state
// call a no-op. PostgREST serializes a zero-row composite RPC as an all-null object, NOT null, so a
// present id — not `data !== null` — is what tells a real hit from a no-op/error. Returning the row
// also hands the caller the DB's authoritative deleted_at.
export async function softDeleteKitchen(supabase: Client, id: string): Promise<Kitchen | null> {
  const { data, error } = await supabase.rpc('soft_delete_kitchen', { kitchen_id: id })
  if (error) console.error('softDeleteKitchen failed:', error.message)
  return data?.id ? data : null
}

export async function restoreKitchen(supabase: Client, id: string): Promise<Kitchen | null> {
  const { data, error } = await supabase.rpc('restore_kitchen', { kitchen_id: id })
  if (error) console.error('restoreKitchen failed:', error.message)
  return data?.id ? data : null
}

// Permanent, irreversible delete via a security-invoker RPC: RLS scopes it to the owner and the
// deleted_at guard makes purging a live kitchen a no-op, so only trashed rows can be destroyed.
// null (no row matched, or an error) = failure. FK on delete cascade will handle future child rows.
export async function purgeKitchen(supabase: Client, id: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('purge_kitchen', { kitchen_id: id })
  if (error) console.error('purgeKitchen failed:', error.message)
  return !error && data?.id != null
}
