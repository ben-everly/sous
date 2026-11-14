'use client'

import { Suspense, lazy, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

const newClient = () =>
  new QueryClient({
    queryCache: new QueryCache({ onError: reportClientError }),
    mutationCache: new MutationCache({ onError: reportClientError }),
  })

export function Providers({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [client] = useState(newClient)
  const [supabase] = useState(createClient)
  const router = useRouter()

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (session && session.user.id !== userId)) {
        // Not a fresh client: it would refetch every mounted query (as anon on sign-out) before the refresh
        // remounts Providers or redirects to /login.
        client.clear()
        router.refresh()
      }
    })
    return () => data.subscription.unsubscribe()
  }, [supabase, client, router, userId])

  return (
    <QueryClientProvider client={client}>
      {children}
      <Suspense>
        <ReactQueryDevtools />
      </Suspense>
    </QueryClientProvider>
  )
}
