import { describe, expect, it } from 'vitest'
import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { encode } from '@supabase-cache-helpers/postgrest-react-query'
import type { Database } from '@/types/database.types'
import { MOCK_SUPABASE_PUBLISHABLE_KEY, MOCK_SUPABASE_URL } from '@/lib/supabase/test-utils'
import { builderClient, searchParams } from '@/test/postgrest'
import { SLOT_COLUMNS, mealPlanQuery } from './queries'

describe('mealPlanQuery', () => {
  it('reads the kitchen slots for the week selecting SLOT_COLUMNS ordered by created_at then id', () => {
    const params = searchParams(mealPlanQuery(builderClient(), 'k1', '2026-10-11'))
    expect(params.get('select')).toBe(SLOT_COLUMNS.replaceAll(' ', ''))
    expect(params.get('kitchen_id')).toBe('eq.k1')
    expect(params.getAll('date')).toEqual(['gte.2026-10-11', 'lte.2026-10-17'])
    expect(params.get('order')).toBe('created_at.asc,id.asc')
  })

  it('derives the same cache key from a server client as from a browser client', () => {
    const server = createServerClient<Database>(MOCK_SUPABASE_URL, MOCK_SUPABASE_PUBLISHABLE_KEY, {
      cookies: { getAll: () => [], setAll: () => {} },
    })
    const browser = createBrowserClient<Database>(MOCK_SUPABASE_URL, MOCK_SUPABASE_PUBLISHABLE_KEY)
    expect(encode(mealPlanQuery(server, 'k1', '2026-10-11'), false)).toEqual(
      encode(mealPlanQuery(browser, 'k1', '2026-10-11'), false),
    )
  })
})
