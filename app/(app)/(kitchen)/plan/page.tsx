import { QueryCache, QueryClient, HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { prefetchQuery } from '@supabase-cache-helpers/postgrest-react-query'
import { MealPlanner } from '@/components/plan/meal-planner'
import { reportServerError } from '@/lib/data/report-server-error'
import { currentKitchen, liveKitchens } from '@/lib/kitchens/current-kitchen'
import { getServerKitchens } from '@/lib/kitchens/prefetch'
import { mealPlanQuery } from '@/lib/plan/queries'
import { parseWeek } from '@/lib/plan/week'
import { createClient } from '@/lib/supabase/server'

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string | string[] }>
}) {
  const { week: param } = await searchParams
  const week = parseWeek(Array.isArray(param) ? param[0] : (param ?? null))
  const queryClient = new QueryClient({
    queryCache: new QueryCache({ onError: reportServerError }),
  })

  if (week) {
    const supabase = await createClient()
    const kitchen = await getServerKitchens().then(
      ([, { data }]) => currentKitchen(liveKitchens(data ?? [])),
      () => null,
    )
    if (kitchen) await prefetchQuery(queryClient, mealPlanQuery(supabase, kitchen.id, week))
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MealPlanner />
    </HydrationBoundary>
  )
}
