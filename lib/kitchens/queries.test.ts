import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import {
  createKitchen,
  listAllKitchens,
  listDeletedKitchens,
  purgeKitchen,
  renameKitchen,
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
  const insertArg = vi.fn()
  const updateArg = vi.fn()
  const rpcArg = vi.fn()
  const chain = {
    select: () => chain,
    insert: (obj: unknown) => {
      insertArg(obj)
      return chain
    },
    update: (obj: unknown) => {
      updateArg(obj)
      return chain
    },
    delete: () => chain,
    order: () => chain,
    eq: () => chain,
    is: () => chain,
    not: () => chain,
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
  return { supabase, insertArg, updateArg, rpcArg }
}

describe('listAllKitchens', () => {
  it('returns the rows (live and trashed) on success', async () => {
    const rows = [
      { id: 'k1', name: 'Beach House', created_at: '2026-01-01', deleted_at: null },
      { id: 'k2', name: 'Lake House', created_at: '2026-01-02', deleted_at: '2026-02-01' },
    ]
    const { supabase } = clientReturning({ data: rows, error: null })
    expect(await listAllKitchens(supabase)).toEqual(rows)
  })

  it('returns null on a read error', async () => {
    const { supabase } = clientReturning({ data: null, error: { code: 'XX000' } })
    expect(await listAllKitchens(supabase)).toBeNull()
  })
})

describe('listDeletedKitchens', () => {
  it('returns the trashed rows on success', async () => {
    const rows = [
      { id: 'k1', name: 'Beach House', created_at: '2026-01-01', deleted_at: '2026-02-01' },
    ]
    const { supabase } = clientReturning({ data: rows, error: null })
    expect(await listDeletedKitchens(supabase)).toEqual(rows)
  })

  it('returns null on a read error', async () => {
    const { supabase } = clientReturning({ data: null, error: { code: 'XX000' } })
    expect(await listDeletedKitchens(supabase)).toBeNull()
  })
})

describe('createKitchen', () => {
  it('stores the given name and returns the new kitchen', async () => {
    const { supabase, insertArg } = clientReturning({
      data: { id: 'k2', name: 'Lake House', created_at: '2026-01-02', deleted_at: null },
      error: null,
    })
    const result = await createKitchen(supabase, 'Lake House')
    expect(insertArg).toHaveBeenCalledWith({ name: 'Lake House' })
    expect(result).toEqual({
      ok: true,
      kitchen: { id: 'k2', name: 'Lake House', created_at: '2026-01-02', deleted_at: null },
    })
  })

  it('reports failure and logs when the insert errors', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { supabase } = clientReturning({ data: null, error: { code: 'XX000', message: 'boom' } })
    expect(await createKitchen(supabase, 'Lake House')).toEqual({ ok: false })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('renameKitchen / purgeKitchen', () => {
  it('return true when the write affects a row', async () => {
    const { supabase } = clientReturning({ data: { id: 'k1' }, error: null })
    expect(await renameKitchen(supabase, 'k1', 'New')).toBe(true)
    expect(await purgeKitchen(supabase, 'k1')).toBe(true)
  })

  it('return false and log when the write errors', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { supabase } = clientReturning({ data: null, error: { code: 'XX000', message: 'boom' } })
    expect(await renameKitchen(supabase, 'k1', 'New')).toBe(false)
    expect(await purgeKitchen(supabase, 'k1')).toBe(false)
    expect(spy).toHaveBeenCalledTimes(2)
    spy.mockRestore()
  })

  it('return false without logging when no row matched (RLS-filtered or stale id)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    // rename is a table update: a 0-row match resolves to null via maybeSingle().
    const rename = clientReturning({ data: null, error: null })
    expect(await renameKitchen(rename.supabase, 'k1', 'New')).toBe(false)
    // purge is a composite RPC: a 0-row match comes back as an all-null object, not null.
    const purge = clientReturning({ data: ALL_NULL_ROW, error: null })
    expect(await purgeKitchen(purge.supabase, 'k1')).toBe(false)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('sends the new name verbatim', async () => {
    const { supabase, updateArg } = clientReturning({ data: { id: 'k1' }, error: null })
    await renameKitchen(supabase, 'k1', 'New')
    expect(updateArg).toHaveBeenCalledWith({ name: 'New' })
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
