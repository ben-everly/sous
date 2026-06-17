import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { createKitchen, deleteKitchen, listKitchens, renameKitchen } from './queries'

type Resp = { data: unknown; error: { code?: string } | null }

function clientReturning(resp: Resp) {
  const insertArg = vi.fn()
  const chain = {
    select: () => chain,
    insert: (obj: unknown) => {
      insertArg(obj)
      return chain
    },
    update: () => chain,
    delete: () => chain,
    order: () => chain,
    eq: () => chain,
    single: () => chain,
    maybeSingle: () => chain,
    then: (resolve: (v: Resp) => void) => resolve(resp),
  }
  const supabase = { from: () => chain } as unknown as SupabaseClient<Database>
  return { supabase, insertArg }
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
  it('stores a blank name as the nameless default', async () => {
    const { supabase, insertArg } = clientReturning({
      data: { id: 'k1', name: null, created_at: '2026-01-01' },
      error: null,
    })
    const result = await createKitchen(supabase, '')
    expect(insertArg).toHaveBeenCalledWith({ name: null })
    expect(result).toEqual({
      ok: true,
      kitchen: { id: 'k1', name: null, created_at: '2026-01-01' },
    })
  })

  it('stores a given name verbatim', async () => {
    const { supabase, insertArg } = clientReturning({
      data: { id: 'k2', name: 'Lake House', created_at: '2026-01-02' },
      error: null,
    })
    await createKitchen(supabase, 'Lake House')
    expect(insertArg).toHaveBeenCalledWith({ name: 'Lake House' })
  })

  it('maps the one-default unique violation to duplicate-default', async () => {
    const { supabase } = clientReturning({ data: null, error: { code: '23505' } })
    expect(await createKitchen(supabase, '')).toEqual({ ok: false, reason: 'duplicate-default' })
  })

  it('maps any other failure to unknown', async () => {
    const { supabase } = clientReturning({ data: null, error: { code: 'XX000' } })
    expect(await createKitchen(supabase, 'Lake House')).toEqual({ ok: false, reason: 'unknown' })
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
})
