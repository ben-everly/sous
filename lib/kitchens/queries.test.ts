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
  it('returns true when the RPC affects a row', async () => {
    const { supabase } = clientReturning({ data: { id: 'k1' }, error: null })
    expect(await purgeKitchen(supabase, 'k1')).toBe(true)
  })

  it('returns false and logs when the RPC errors', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { supabase } = clientReturning({ data: null, error: { code: 'XX000', message: 'boom' } })
    expect(await purgeKitchen(supabase, 'k1')).toBe(false)
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  it('returns false without logging when the no-op serializes as an all-null object', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { supabase } = clientReturning({ data: ALL_NULL_ROW, error: null })
    expect(await purgeKitchen(supabase, 'k1')).toBe(false)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('softDeleteKitchen / restoreKitchen', () => {
  it('call the matching RPC with the kitchen id and return the affected row', async () => {
    const row = { id: 'k1', name: null, created_at: '2026-01-01', deleted_at: '2026-02-01' }
    const { supabase, rpcArg } = clientReturning({ data: row, error: null })
    expect(await softDeleteKitchen(supabase, 'k1')).toEqual(row)
    expect(rpcArg).toHaveBeenCalledWith('soft_delete_kitchen', { kitchen_id: 'k1' })
    expect(await restoreKitchen(supabase, 'k1')).toEqual(row)
    expect(rpcArg).toHaveBeenCalledWith('restore_kitchen', { kitchen_id: 'k1' })
  })

  it('return null on a no-op, which PostgREST serializes as an all-null object (wrong state / not owned)', async () => {
    const { supabase } = clientReturning({ data: ALL_NULL_ROW, error: null })
    expect(await softDeleteKitchen(supabase, 'k1')).toBeNull()
    expect(await restoreKitchen(supabase, 'k1')).toBeNull()
  })

  it('return null and log when the RPC errors', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { supabase } = clientReturning({ data: null, error: { code: 'XX000', message: 'boom' } })
    expect(await softDeleteKitchen(supabase, 'k1')).toBeNull()
    expect(await restoreKitchen(supabase, 'k1')).toBeNull()
    expect(spy).toHaveBeenCalledTimes(2)
    spy.mockRestore()
  })
})
