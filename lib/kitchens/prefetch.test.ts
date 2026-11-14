import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { encode } from '@supabase-cache-helpers/postgrest-react-query'
import { createMockClient, mockSupabase, resetMockSupabase } from '@/test/supabase-mock'
import { allKitchensQuery } from './queries'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => createMockClient(mockSupabase)),
}))
vi.mock('@/lib/data/report-server-error', () => ({ reportServerError: vi.fn() }))

import { reportServerError } from '@/lib/data/report-server-error'
import { createClient } from '@/lib/supabase/server'
import { prefetchKitchens } from './prefetch'

const row = { id: 'k1', name: 'Home', created_at: '2026-01-01T00:00:00Z', deleted_at: null }
const key = () => encode(allKitchensQuery(createMockClient(mockSupabase)), false)

beforeEach(resetMockSupabase)
afterEach(() => vi.clearAllMocks())

it('seeds the client under the key the browser hook reads', async () => {
  mockSupabase.results.select = { data: [row], error: null }
  const queryClient = new QueryClient()

  await prefetchKitchens(queryClient)

  expect(queryClient.getQueryData<{ data: unknown }>(key())?.data).toEqual([row])
})

it('reports a failed read and leaves the client empty', async () => {
  mockSupabase.results.select = { data: null, error: { message: 'boom' } }
  const queryClient = new QueryClient()

  await expect(prefetchKitchens(queryClient)).resolves.toBeUndefined()
  expect(queryClient.getQueryData(key())).toBeUndefined()
  expect(reportServerError).toHaveBeenCalledTimes(1)
})

it('reports a server client that fails to build', async () => {
  vi.mocked(createClient).mockRejectedValueOnce(new Error('missing env'))

  await expect(prefetchKitchens(new QueryClient())).resolves.toBeUndefined()
  expect(reportServerError).toHaveBeenCalledTimes(1)
})
