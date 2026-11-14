import { describe, expect, it } from 'vitest'
import { currentKitchen, liveKitchens } from './current-kitchen'
import type { Kitchen } from './types'

const kitchen = (
  id: string,
  created_at = '2026-01-01T00:00:00Z',
  deleted_at: string | null = null,
): Kitchen => ({ id, name: id, created_at, deleted_at })

describe('currentKitchen', () => {
  it('returns null for an empty list', () => {
    expect(currentKitchen([])).toBeNull()
  })

  it('returns the first kitchen', () => {
    expect(currentKitchen([kitchen('a'), kitchen('b')])).toEqual(kitchen('a'))
  })
})

describe('liveKitchens', () => {
  it('drops trashed kitchens and orders by creation, then id', () => {
    const rows = [
      kitchen('c', '2026-01-02T00:00:00Z'),
      kitchen('b'),
      kitchen('t', '2026-01-01T00:00:00Z', '2026-02-01T00:00:00Z'),
      kitchen('a'),
    ]
    expect(liveKitchens(rows).map((k) => k.id)).toEqual(['a', 'b', 'c'])
  })

  it('leaves its input untouched', () => {
    const rows = [kitchen('b'), kitchen('a')]
    liveKitchens(rows)
    expect(rows.map((k) => k.id)).toEqual(['b', 'a'])
  })
})
