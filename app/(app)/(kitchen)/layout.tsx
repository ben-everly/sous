import { QueryClient, HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { CurrentKitchenProvider } from '@/components/kitchens/current-kitchen'
import { prefetchKitchens } from '@/lib/kitchens/prefetch'

export default async function KitchenLayout({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient()
  await prefetchKitchens(queryClient)

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <CurrentKitchenProvider>{children}</CurrentKitchenProvider>
      </HydrationBoundary>
    </div>
  )
}
