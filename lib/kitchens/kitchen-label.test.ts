import { describe, expect, it } from 'vitest'
import { kitchenLabel } from './kitchen-label'

describe('kitchenLabel', () => {
  it('returns the stored name when present', () => {
    expect(kitchenLabel('Beach House', 'Ada')).toBe('Beach House')
  })

  it("falls back to the owner's name when the kitchen is nameless", () => {
    expect(kitchenLabel(null, 'Ada')).toBe("Ada's Kitchen")
  })

  it('falls back to "My Kitchen" when nameless and there is no display name', () => {
    expect(kitchenLabel(null, null)).toBe('My Kitchen')
  })
})
