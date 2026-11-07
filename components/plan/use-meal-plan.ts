'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  decode,
  prefetchQuery,
  useDeleteMutation,
  usePostgrestFilterCache,
  useQuery,
  useUpsertMutation,
} from '@supabase-cache-helpers/postgrest-react-query'
import { useQueryClient, type Query } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { queryStatus } from '@/lib/data/query-status'
import { SLOT_COLUMNS, mealPlanQuery, type Slot } from '@/lib/plan/queries'
import { shiftWeek, weekdayName, type MealType } from '@/lib/plan/week'

const FRESH = Infinity

export function useMealPlan(kitchenId: string, start: string) {
  const [supabase] = useState(createClient)
  const queryClient = useQueryClient()

  const builder = useMemo(
    () => mealPlanQuery(supabase, kitchenId, start),
    [supabase, kitchenId, start],
  )
  const query = useQuery(builder, {
    staleTime: FRESH,
    placeholderData: (prev) =>
      prev?.data?.every((s) => s.kitchen_id === kitchenId) ? prev : undefined,
  })
  useEffect(() => {
    ;[-1, 1].forEach((n) => {
      const s = shiftWeek(start, n)
      if (s)
        void prefetchQuery(queryClient, mealPlanQuery(supabase, kitchenId, s), {
          staleTime: FRESH,
        })
    })
  }, [supabase, queryClient, kitchenId, start])

  const getFilter = usePostgrestFilterCache()
  const showing =
    (rows: unknown[]) =>
    ({ queryKey }: Query) => {
      const k = decode(queryKey)
      return (
        k?.table === 'meal_plan_slots' && rows.some((r) => getFilter(k.queryKey).applyFilters(r))
      )
    }
  const pending = useRef(0)
  const written = useRef<unknown[]>([])
  const sync = {
    onError: () => void toast.error("Couldn't update the plan. Try again."),
    onMutate: (rows: unknown) => {
      pending.current++
      written.current.push(...[rows].flat())
      return queryClient.cancelQueries({ predicate: showing([rows].flat()) })
    },
    onSettled: () => {
      if (--pending.current === 0)
        void queryClient.invalidateQueries({
          predicate: showing(written.current.splice(0)),
          refetchType: 'all',
        })
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
    onSuccess: (slot: Slot | null) =>
      slot &&
      toast(`Removed "${slot.recipes.name}" from ${weekdayName(slot.date)} ${slot.meal_type}`, {
        id: `remove-${slot.id}`,
        duration: 8000,
        action: { label: 'Undo', onClick: () => add(slot.date, slot.meal_type, slot.recipe_id) },
      }),
  })

  return {
    status: queryStatus(query),
    stale: query.isPlaceholderData,
    retry: () => void query.refetch(),
    slotsFor: (date: string, mealType: MealType) =>
      (query.data ?? []).filter((s) => s.date === date && s.meal_type === mealType),
    add,
    remove: (slot: Slot) => del.mutate(slot),
  }
}
