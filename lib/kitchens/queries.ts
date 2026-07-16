import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

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
// call a harmless no-op. Success = non-error: a transport/RLS failure throws (the caller's mutation
// rolls back and the MutationCache sink logs it), while a zero-row no-op resolves like any other hit.
export async function softDeleteKitchen(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.rpc('soft_delete_kitchen', { kitchen_id: id })
  if (error) throw error
}

export async function restoreKitchen(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.rpc('restore_kitchen', { kitchen_id: id })
  if (error) throw error
}

// Permanent, irreversible delete via a security-invoker RPC: RLS scopes it to the owner and the
// deleted_at guard makes purging a live kitchen a no-op, so only trashed rows can be destroyed.
// FK on delete cascade will handle future child rows.
export async function purgeKitchen(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.rpc('purge_kitchen', { kitchen_id: id })
  if (error) throw error
}
