import { CurrentKitchenProvider } from '@/components/kitchens/current-kitchen'

export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <CurrentKitchenProvider>{children}</CurrentKitchenProvider>
    </div>
  )
}
