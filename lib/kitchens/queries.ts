import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { Kitchen } from './types'

type Client = SupabaseClient<Database>

export type CreateResult = { ok: true; kitchen: Kitchen } | { ok: false }

// null = read failed; an empty array is a real empty account.
// Tiebreak on id so the order is total: the nameless kitchen, always the oldest row, stays first.
export async function listKitchens(supabase: Client): Promise<Kitchen[] | null> {
  const { data, error } = await supabase
    .from('kitchens')
    .select('id, name, created_at')
    .order('created_at')
    .order('id')
  return error ? null : data
}

// The UI only ever creates named kitchens; the lone nameless kitchen is bootstrapped at signup.
export async function createKitchen(supabase: Client, name: string): Promise<CreateResult> {
  const { data, error } = await supabase
    .from('kitchens')
    .insert({ name })
    .select('id, name, created_at')
    .single()
  if (error) console.error('createKitchen failed:', error.message)
  return data ? { ok: true, kitchen: data } : { ok: false }
}

// .select().maybeSingle() so a zero-row match (RLS-filtered or stale id) reports failure, not silent success.
// A real error is logged; a zero-row match is an expected outcome, so it stays silent.
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

export async function deleteKitchen(supabase: Client, id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('kitchens')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()
  if (error) console.error('deleteKitchen failed:', error.message)
  return !error && data !== null
}
