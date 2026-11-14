'use client'

import { createContext, useContext, type ReactNode } from 'react'
import Link from 'next/link'
import { useKitchens } from './use-kitchens'
import { LoadError } from '@/components/load-error'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { currentKitchen } from '@/lib/kitchens/current-kitchen'

const CurrentKitchen = createContext<string | null>(null)

export function useCurrentKitchen() {
  const id = useContext(CurrentKitchen)
  if (!id) throw new Error('useCurrentKitchen must be used inside CurrentKitchenProvider')
  return id
}

export function CurrentKitchenProvider({ children }: { children: ReactNode }) {
  const { kitchens, status, retry } = useKitchens()
  const kitchen = currentKitchen(kitchens)

  if (status === 'ready' && kitchen)
    return <CurrentKitchen value={kitchen.id}>{children}</CurrentKitchen>

  return (
    <>
      {status === 'loading' && <Spinner label="Loading your kitchens" />}
      {status === 'error' && <LoadError message="Could not load your kitchens." onRetry={retry} />}
      {status === 'ready' && (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>
              <h1>No kitchen yet</h1>
            </EmptyTitle>
            <EmptyDescription>Create a kitchen to get started.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/settings/kitchens">Go to kitchens</Link>
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </>
  )
}
