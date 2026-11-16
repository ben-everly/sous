import { QueryClient, HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { KitchensManager } from '@/components/kitchens/kitchens-manager'
import { prefetchKitchens } from '@/lib/kitchens/prefetch'

export default async function KitchensSettingsPage() {
  const queryClient = new QueryClient()
  await prefetchKitchens(queryClient)

  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight">Kitchens</h2>
      <p className="text-muted-foreground text-sm">Manage the kitchens you own.</p>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <KitchensManager />
      </HydrationBoundary>
    </section>
  )
}
