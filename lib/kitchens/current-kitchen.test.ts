import { describe, expect, it } from 'vitest'
import { currentKitchen } from './current-kitchen'
import type { Kitchen } from './types'

const kitchen = (id: string): Kitchen => ({
  id,
  name: id,
  created_at: '2026-01-01T00:00:00Z',
  deleted_at: null,
})

describe('currentKitchen', () => {
  it('returns null for an empty list', () => {
    expect(currentKitchen([])).toBeNull()
  })

  it('returns the first kitchen', () => {
    expect(currentKitchen([kitchen('a'), kitchen('b')])).toEqual(kitchen('a'))
  })
})
