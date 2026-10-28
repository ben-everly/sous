import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription } from '@/components/ui/empty'

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Empty className="mt-6 border">
      <EmptyDescription>{message}</EmptyDescription>
      <EmptyContent>
        <Button onClick={onRetry}>Try again</Button>
      </EmptyContent>
    </Empty>
  )
}
