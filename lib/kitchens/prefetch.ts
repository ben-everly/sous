import 'server-only'
import { cache } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { fetchQueryInitialData } from '@supabase-cache-helpers/postgrest-react-query'
import { reportServerError } from '@/lib/data/report-server-error'
import { createClient } from '@/lib/supabase/server'
import { allKitchensQuery } from './queries'

// One kitchens read per request, shared by every Server Component that needs it; each still
// dehydrates its own QueryClient, so no boundary re-serializes another's queries.
export const getServerKitchens = cache(() =>
  createClient()
    .then((supabase) => fetchQueryInitialData(allKitchensQuery(supabase)))
    .catch((e) => {
      reportServerError(e)
      throw e
    }),
)

export const prefetchKitchens = (queryClient: QueryClient) =>
  getServerKitchens().then(
    ([key, kitchens]) => void queryClient.setQueryData(key, kitchens),
    () => {},
  )
