import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import {
  COLUMNS,
  allKitchensQuery,
  purgeKitchen,
  restoreKitchen,
  softDeleteKitchen,
} from './queries'

type Resp = {
  data: unknown
  error: { code?: string; message?: string } | null
}

// PostgREST serializes a zero-row `returns public.kitchens` RPC as an all-null object, not JSON null.
const ALL_NULL_ROW = {
  id: null,
  owner_id: null,
  name: null,
  created_at: null,
  updated_at: null,
  deleted_at: null,
}

function clientReturning(resp: Resp) {
  const rpcArg = vi.fn()
  const chain = {
    select: () => chain,
    order: () => chain,
    eq: () => chain,
    single: () => chain,
    maybeSingle: () => chain,
    then: (resolve: (v: Resp) => void) => resolve(resp),
  }
  const supabase = {
    from: () => chain,
    rpc: (name: string, args: unknown) => {
      rpcArg(name, args)
      return chain
    },
  } as unknown as SupabaseClient<Database>
  return { supabase, rpcArg }
}

describe('allKitchensQuery', () => {
  it('reads every kitchen (live and trashed) selecting COLUMNS ordered by created_at then id', () => {
    const calls: Array<[string, unknown]> = []
    const chain = {
      select: (c: unknown) => (calls.push(['select', c]), chain),
      order: (c: unknown) => (calls.push(['order', c]), chain),
    }
    const supabase = {
      from: (t: unknown) => (calls.push(['from', t]), chain),
    } as unknown as SupabaseClient<Database>

    allKitchensQuery(supabase)

    expect(calls).toEqual([
      ['from', 'kitchens'],
      ['select', COLUMNS],
      ['order', 'created_at'],
      ['order', 'id'],
    ])
  })
})

describe('purgeKitchen', () => {
  it('resolves and calls the RPC when it affects a row', async () => {
    const { supabase, rpcArg } = clientReturning({ data: { id: 'k1' }, error: null })
    await expect(purgeKitchen(supabase, 'k1')).resolves.toBeUndefined()
    expect(rpcArg).toHaveBeenCalledWith('purge_kitchen', { kitchen_id: 'k1' })
  })

  it('rejects with the error when the RPC errors', async () => {
    const error = { code: 'XX000', message: 'boom' }
    const { supabase } = clientReturning({ data: null, error })
    await expect(purgeKitchen(supabase, 'k1')).rejects.toBe(error)
  })

  it('resolves on a zero-row no-op serialized as an all-null object', async () => {
    const { supabase } = clientReturning({ data: ALL_NULL_ROW, error: null })
    await expect(purgeKitchen(supabase, 'k1')).resolves.toBeUndefined()
  })
})

describe('softDeleteKitchen / restoreKitchen', () => {
  it('call the matching RPC with the kitchen id and resolve on success', async () => {
    const row = { id: 'k1', name: null, created_at: '2026-01-01', deleted_at: '2026-02-01' }
    const { supabase, rpcArg } = clientReturning({ data: row, error: null })
    await expect(softDeleteKitchen(supabase, 'k1')).resolves.toBeUndefined()
    expect(rpcArg).toHaveBeenCalledWith('soft_delete_kitchen', { kitchen_id: 'k1' })
    await expect(restoreKitchen(supabase, 'k1')).resolves.toBeUndefined()
    expect(rpcArg).toHaveBeenCalledWith('restore_kitchen', { kitchen_id: 'k1' })
  })

  it('resolve on a zero-row no-op serialized as an all-null object (wrong state / not owned)', async () => {
    const { supabase } = clientReturning({ data: ALL_NULL_ROW, error: null })
    await expect(softDeleteKitchen(supabase, 'k1')).resolves.toBeUndefined()
    await expect(restoreKitchen(supabase, 'k1')).resolves.toBeUndefined()
  })

  it('reject with the error when the RPC errors', async () => {
    const error = { code: 'XX000', message: 'boom' }
    const { supabase } = clientReturning({ data: null, error })
    await expect(softDeleteKitchen(supabase, 'k1')).rejects.toBe(error)
    await expect(restoreKitchen(supabase, 'k1')).rejects.toBe(error)
  })
})
