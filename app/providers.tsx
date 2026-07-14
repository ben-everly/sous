'use client'

import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createClient } from '@/lib/supabase/client'

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient())
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
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
