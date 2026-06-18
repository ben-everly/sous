import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { createKitchen, deleteKitchen, listKitchens, renameKitchen } from './queries'

type Resp = { data: unknown; error: { code?: string } | null }

function clientReturning(resp: Resp) {
  const insertArg = vi.fn()
  const updateArg = vi.fn()
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
    single: () => chain,
    maybeSingle: () => chain,
    then: (resolve: (v: Resp) => void) => resolve(resp),
  }
  const supabase = { from: () => chain } as unknown as SupabaseClient<Database>
  return { supabase, insertArg, updateArg }
}

describe('listKitchens', () => {
  it('returns the rows on success', async () => {
    const rows = [{ id: 'k1', name: 'Beach House', created_at: '2026-01-01' }]
    const { supabase } = clientReturning({ data: rows, error: null })
    expect(await listKitchens(supabase)).toEqual(rows)
  })

  it('returns null on a read error', async () => {
    const { supabase } = clientReturning({ data: null, error: { code: 'XX000' } })
    expect(await listKitchens(supabase)).toBeNull()
  })
})

describe('createKitchen', () => {
  it('stores the given name and returns the new kitchen', async () => {
    const { supabase, insertArg } = clientReturning({
      data: { id: 'k2', name: 'Lake House', created_at: '2026-01-02' },
      error: null,
    })
    const result = await createKitchen(supabase, 'Lake House')
    expect(insertArg).toHaveBeenCalledWith({ name: 'Lake House' })
    expect(result).toEqual({
      ok: true,
      kitchen: { id: 'k2', name: 'Lake House', created_at: '2026-01-02' },
    })
  })

  it('reports failure when the insert errors', async () => {
    const { supabase } = clientReturning({ data: null, error: { code: 'XX000' } })
    expect(await createKitchen(supabase, 'Lake House')).toEqual({ ok: false })
  })
})

describe('renameKitchen / deleteKitchen', () => {
  it('return true when the write affects a row', async () => {
    const { supabase } = clientReturning({ data: { id: 'k1' }, error: null })
    expect(await renameKitchen(supabase, 'k1', 'New')).toBe(true)
    expect(await deleteKitchen(supabase, 'k1')).toBe(true)
  })

  it('return false when the write errors', async () => {
    const { supabase } = clientReturning({ data: null, error: { code: 'XX000' } })
    expect(await renameKitchen(supabase, 'k1', 'New')).toBe(false)
    expect(await deleteKitchen(supabase, 'k1')).toBe(false)
  })

  it('return false when no row matched (RLS-filtered or stale id)', async () => {
    const { supabase } = clientReturning({ data: null, error: null })
    expect(await renameKitchen(supabase, 'k1', 'New')).toBe(false)
    expect(await deleteKitchen(supabase, 'k1')).toBe(false)
  })

  it('sends the new name verbatim', async () => {
    const { supabase, updateArg } = clientReturning({ data: { id: 'k1' }, error: null })
    await renameKitchen(supabase, 'k1', 'New')
    expect(updateArg).toHaveBeenCalledWith({ name: 'New' })
  })
})
