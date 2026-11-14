import type { QueryData, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { weekDates } from './week'

type Client = SupabaseClient<Database>

// cache-helpers checks list filters against cached rows, so every filtered or grouped column is selected.
export const SLOT_COLUMNS =
  'id, kitchen_id, date, meal_type, recipe_id, created_at, recipes(id, slug, name)'

export function mealPlanQuery(supabase: Client, kitchenId: string, start: string) {
  return supabase
    .from('meal_plan_slots')
    .select(SLOT_COLUMNS)
    .eq('kitchen_id', kitchenId)
    .gte('date', start)
    .lte('date', weekDates(start)[6])
    .order('created_at')
    .order('id')
}

export type Slot = QueryData<ReturnType<typeof mealPlanQuery>>[number]
