import { describe, expect, it } from 'vitest'
import { builderClient, searchParams } from '@/test/postgrest'
import { SLOT_COLUMNS, mealPlanQuery } from './queries'

describe('mealPlanQuery', () => {
  it('reads the kitchen slots in the range selecting SLOT_COLUMNS ordered by created_at then id', () => {
    const params = searchParams(mealPlanQuery(builderClient(), 'k1', '2026-10-11', '2026-10-17'))
    expect(params.get('select')).toBe(SLOT_COLUMNS.replaceAll(' ', ''))
    expect(params.get('kitchen_id')).toBe('eq.k1')
    expect(params.getAll('date')).toEqual(['gte.2026-10-11', 'lte.2026-10-17'])
    expect(params.get('order')).toBe('created_at.asc,id.asc')
  })
})
