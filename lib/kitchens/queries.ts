import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { Kitchen } from './types'

// Take the Supabase client as a param (not the browser client) so a mobile client can reuse these.
type Client = SupabaseClient<Database>

export type CreateResult =
  | { ok: true; kitchen: Kitchen }
  | { ok: false; reason: 'duplicate-default' | 'unknown' }

// null = read failed; an empty array is a real empty account.
export async function listKitchens(supabase: Client): Promise<Kitchen[] | null> {
  const { data, error } = await supabase
    .from('kitchens')
    .select('id, name, created_at')
    .order('created_at')
  return error ? null : data
}

// A blank name stores the nameless default kitchen
export async function createKitchen(supabase: Client, name: string): Promise<CreateResult> {
  const { data, error } = await supabase
    .from('kitchens')
    .insert({ name: name === '' ? null : name })
    .select('id, name, created_at')
    .single()
  if (data) return { ok: true, kitchen: data }
  // 23505 = the one-default-kitchen unique index
  if (error?.code === '23505') return { ok: false, reason: 'duplicate-default' }
  return { ok: false, reason: 'unknown' }
}

// A blank name resets to the nameless default
// .select().maybeSingle() so a zero-row match (RLS-filtered or stale id) reports failure, not silent success.
export async function renameKitchen(supabase: Client, id: string, name: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('kitchens')
    .update({ name: name === '' ? null : name })
    .eq('id', id)
    .select('id')
    .maybeSingle()
  return !error && data !== null
}

export async function deleteKitchen(supabase: Client, id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('kitchens')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()
  return !error && data !== null
}
