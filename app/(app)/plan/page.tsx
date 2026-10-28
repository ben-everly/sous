import { requireAuthedUser } from '@/lib/auth/gate'
import { CurrentKitchenPlanner } from '@/components/plan/meal-planner'

export default async function PlanPage() {
  await requireAuthedUser()

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <CurrentKitchenPlanner />
    </div>
  )
}
