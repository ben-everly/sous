import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export const RECIPE_COLUMNS =
  'slug, name, description, ingredients, directions, yield, nutrition, notes, contributor'

const PAGE_SIZE = 1000

export async function recipeBySlug(supabase: SupabaseClient<Database>, slug: string) {
  const { data, error } = await supabase
    .from('recipes')
    .select(RECIPE_COLUMNS)
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return data
}

export type PublicRecipe = NonNullable<Awaited<ReturnType<typeof recipeBySlug>>>

export async function allRecipeSitemapEntries(supabase: SupabaseClient<Database>) {
  const entries: Array<{ slug: string; updated_at: string }> = []
  for (;;) {
    const { data, error } = await supabase
      .from('recipes')
      .select('slug, updated_at')
      .gt('slug', entries.at(-1)?.slug ?? '')
      .order('slug')
      .limit(PAGE_SIZE)
    if (error) throw error
    // A short page may just be PostgREST's max_rows cap; only an empty one is the end.
    if (data.length === 0) return entries
    entries.push(...data)
  }
}
