import type { QueryData, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

type Client = SupabaseClient<Database>

// cache-helpers checks list filters against cached rows, so every filtered or grouped column is selected.
export const SLOT_COLUMNS =
  'id, kitchen_id, date, meal_type, recipe_id, created_at, recipes(id, slug, name)'

export function mealPlanQuery(supabase: Client, kitchenId: string, from: string, to: string) {
  return supabase
    .from('meal_plan_slots')
    .select(SLOT_COLUMNS)
    .eq('kitchen_id', kitchenId)
    .gte('date', from)
    .lte('date', to)
    .order('created_at')
    .order('id')
}

export type Slot = QueryData<ReturnType<typeof mealPlanQuery>>[number]
