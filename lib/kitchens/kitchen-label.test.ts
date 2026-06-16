import { describe, expect, it } from 'vitest'
import { kitchenLabel } from './kitchen-label'

describe('kitchenLabel', () => {
  it('returns the stored name when present', () => {
    expect(kitchenLabel('Beach House')).toBe('Beach House')
  })

  it('falls back to "My Kitchen" when the kitchen is nameless', () => {
    expect(kitchenLabel(null)).toBe('My Kitchen')
  })
})
