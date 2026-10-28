'use client'

import { useMemo, useRef, useState } from 'react'
import {
  encode,
  useDeleteMutation,
  useQuery,
  useUpsertMutation,
} from '@supabase-cache-helpers/postgrest-react-query'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { queryStatus } from '@/lib/data/query-status'
import { SLOT_COLUMNS, mealPlanQuery, type Slot } from '@/lib/plan/queries'
import { weekdayName, type MealType } from '@/lib/plan/week'

export function useMealPlan(kitchenId: string, from: string, to: string) {
  const [supabase] = useState(createClient)
  const queryClient = useQueryClient()

  const builder = useMemo(
    () => mealPlanQuery(supabase, kitchenId, from, to),
    [supabase, kitchenId, from, to],
  )
  const query = useQuery(builder)
  const queryKey = encode(builder, false)

  // A read in flight when a write lands would overwrite the cache with pre-write rows, so cancel reads
  // before each write and refetch only once the last overlapping write settles.
  const pending = useRef(0)
  const sync = {
    onError: () => void toast.error("Couldn't update the plan. Try again."),
    onMutate: () => {
      pending.current++
      return queryClient.cancelQueries({ queryKey })
    },
    onSettled: () => {
      if (--pending.current === 0) void queryClient.invalidateQueries({ queryKey })
    },
  }
  const upsert = useUpsertMutation(supabase.from('meal_plan_slots'), ['id'], SLOT_COLUMNS, {
    onConflict: 'kitchen_id,date,meal_type,recipe_id',
    ignoreDuplicates: true,
    ...sync,
  })
  const add = (date: string, mealType: MealType, recipeId: string) =>
    upsert.mutate([{ kitchen_id: kitchenId, date, meal_type: mealType, recipe_id: recipeId }])

  const del = useDeleteMutation(supabase.from('meal_plan_slots'), ['id'], SLOT_COLUMNS, {
    ...sync,
    // A 0-row delete (already gone, or its kitchen trashed) resolves null: nothing to undo.
    onSuccess: (slot) =>
      slot &&
      toast(`Removed "${slot.recipes.name}" from ${weekdayName(slot.date)} ${slot.meal_type}`, {
        id: `remove-${slot.id}`,
        duration: 8000,
        action: { label: 'Undo', onClick: () => add(slot.date, slot.meal_type, slot.recipe_id) },
      }),
  })

  return {
    status: queryStatus(query),
    retry: () => void query.refetch(),
    slotsFor: (date: string, mealType: MealType) =>
      (query.data ?? []).filter((s) => s.date === date && s.meal_type === mealType),
    add,
    remove: (slot: Slot) => del.mutate({ id: slot.id }),
  }
}
