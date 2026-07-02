import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { Kitchen } from './types'

type Client = SupabaseClient<Database>

export type CreateResult = { ok: true; kitchen: Kitchen } | { ok: false }

const COLUMNS = 'id, name, created_at, deleted_at'

// null = read failed; an empty array is a real empty account.
// Tiebreak on id so the order is total: the nameless kitchen, always the oldest row, stays first.
export async function listKitchens(supabase: Client): Promise<Kitchen[] | null> {
  const { data, error } = await supabase
    .from('kitchens')
    .select(COLUMNS)
    .is('deleted_at', null)
    .order('created_at')
    .order('id')
  return error ? null : data
}

// The trash list: most-recently-deleted first.
export async function listDeletedKitchens(supabase: Client): Promise<Kitchen[] | null> {
  const { data, error } = await supabase
    .from('kitchens')
    .select(COLUMNS)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
  return error ? null : data
}

// The UI only ever creates named kitchens; the lone nameless kitchen is bootstrapped at signup.
export async function createKitchen(supabase: Client, name: string): Promise<CreateResult> {
  const { data, error } = await supabase.from('kitchens').insert({ name }).select(COLUMNS).single()
  if (error) console.error('createKitchen failed:', error.message)
  return data ? { ok: true, kitchen: data } : { ok: false }
}

// .select().maybeSingle() so a zero-row match (RLS-filtered or stale id) reports failure, not silent success.
export async function renameKitchen(supabase: Client, id: string, name: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('kitchens')
    .update({ name })
    .eq('id', id)
    .select('id')
    .maybeSingle()
  if (error) console.error('renameKitchen failed:', error.message)
  return !error && data !== null
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
