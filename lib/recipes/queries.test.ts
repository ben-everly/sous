import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { RECIPE_COLUMNS, allRecipeSitemapEntries, recipeBySlug } from './queries'

type Resp = { data: unknown; error: { message: string } | null }

function stub(responses: Resp[]) {
  const calls: Array<[string, ...unknown[]]> = []
  const chain = {
    select: (...a: unknown[]) => (calls.push(['select', ...a]), chain),
    eq: (...a: unknown[]) => (calls.push(['eq', ...a]), chain),
    order: (...a: unknown[]) => (calls.push(['order', ...a]), chain),
    gt: (...a: unknown[]) => (calls.push(['gt', ...a]), chain),
    limit: (...a: unknown[]) => (calls.push(['limit', ...a]), chain),
    maybeSingle: () => chain,
    then: (resolve: (v: Resp) => void) => resolve(responses.shift()!),
  }
  const supabase = {
    from: (t: string) => (calls.push(['from', t]), chain),
  } as unknown as SupabaseClient<Database>
  return { supabase, calls }
}

const rows = (n: number, offset = 0) =>
  Array.from({ length: n }, (_, i) => ({ slug: `s${offset + i}`, updated_at: 'x' }))

describe('recipeBySlug', () => {
  it('selects RECIPE_COLUMNS filtered by slug and returns the row', async () => {
    const row = { slug: 'a' }
    const { supabase, calls } = stub([{ data: row, error: null }])
    await expect(recipeBySlug(supabase, 'a')).resolves.toBe(row)
    expect(calls).toEqual([
      ['from', 'recipes'],
      ['select', RECIPE_COLUMNS],
      ['eq', 'slug', 'a'],
    ])
  })

  it('resolves null when no row matches', async () => {
    const { supabase } = stub([{ data: null, error: null }])
    await expect(recipeBySlug(supabase, 'nope')).resolves.toBeNull()
  })

  it('throws the PostgREST error', async () => {
    const error = { message: 'boom' }
    const { supabase } = stub([{ data: null, error }])
    await expect(recipeBySlug(supabase, 'a')).rejects.toBe(error)
  })
})

describe('allRecipeSitemapEntries', () => {
  it('pages by slug until an empty page', async () => {
    const { supabase, calls } = stub([
      { data: rows(1000), error: null },
      { data: rows(5, 1000), error: null },
      { data: [], error: null },
    ])
    const out = await allRecipeSitemapEntries(supabase)
    expect(out).toHaveLength(1005)
    expect(calls.filter(([k]) => k === 'gt')).toEqual([
      ['gt', 'slug', ''],
      ['gt', 'slug', 's999'],
      ['gt', 'slug', 's1004'],
    ])
    expect(calls).toContainEqual(['order', 'slug'])
    expect(calls).toContainEqual(['limit', 1000])
    expect(calls).toContainEqual(['select', 'slug, updated_at'])
  })

  it('keeps paging when max_rows caps a read below the page size', async () => {
    const { supabase } = stub([
      { data: rows(500), error: null },
      { data: rows(500, 500), error: null },
      { data: rows(124, 1000), error: null },
      { data: [], error: null },
    ])
    const out = await allRecipeSitemapEntries(supabase)
    expect(out.map((r) => r.slug)).toEqual(rows(1124).map((r) => r.slug))
  })

  it('throws on a later page error', async () => {
    const error = { message: 'late' }
    const { supabase } = stub([
      { data: rows(1000), error: null },
      { data: null, error },
    ])
    await expect(allRecipeSitemapEntries(supabase)).rejects.toBe(error)
  })
})
