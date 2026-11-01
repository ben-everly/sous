'use client'

import { Suspense, lazy, useEffect, useRef, useState } from 'react'
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

export function Providers({ children }: { children: React.ReactNode }) {
  // Keyed so the tree remounts: hooks bind observers to the first client they see.
  // A fresh client, not resetQueries, so the old user's in-flight work settles into the discarded one.
  const [{ client, generation }, setQueryState] = useState(() => ({
    client: newClient(),
    generation: 0,
  }))
  const [supabase] = useState(createClient)
  const router = useRouter()
  // Refs so the baseline survives the resubscribe a swap triggers.
  // auth-js can emit SIGNED_IN before INITIAL_SESSION.
  const baselined = useRef(false)
  const currentUserId = useRef<string | undefined>(undefined)

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user?.id
      if (baselined.current && event === 'SIGNED_OUT') {
        // A fresh client would refetch as anon; clear() is safe because refresh redirects to /login.
        client.clear()
        router.refresh()
      } else if (baselined.current && userId !== currentUserId.current) {
        setQueryState((s) => ({ client: newClient(), generation: s.generation + 1 }))
      }
      baselined.current = true
      currentUserId.current = userId
    })
    return () => data.subscription.unsubscribe()
  }, [supabase, client, router])

  return (
    <QueryClientProvider key={generation} client={client}>
      {children}
      <Suspense>
        <ReactQueryDevtools />
      </Suspense>
    </QueryClientProvider>
  )
}
