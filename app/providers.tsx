'use client'

import { Suspense, lazy, useEffect, useState } from 'react'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { reportClientError } from '@/lib/data/report-client-error'

// Dev-only, lazy + dynamically imported so a production build never resolves or bundles the module
// (it lives in devDependencies, so a prod-only install won't have it). The prod/test branch is a
// no-op the bundler dead-code-eliminates.
const ReactQueryDevtools =
  process.env.NODE_ENV === 'development'
    ? lazy(() =>
        import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })),
      )
    : () => null

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: reportClientError }),
        mutationCache: new MutationCache({ onError: reportClientError }),
      }),
  )
  const [supabase] = useState(createClient)

  useEffect(() => {
    let currentUserId: string | undefined
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user?.id
      if (event === 'INITIAL_SESSION') {
        currentUserId = userId
        return
      }
      if (event === 'SIGNED_OUT' || userId !== currentUserId) client.clear()
      currentUserId = userId
    })
    return () => data.subscription.unsubscribe()
  }, [supabase, client])

  return (
    <QueryClientProvider client={client}>
      {children}
      <Suspense>
        <ReactQueryDevtools />
      </Suspense>
    </QueryClientProvider>
  )
}
