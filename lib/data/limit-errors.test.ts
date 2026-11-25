import { describe, expect, it } from 'vitest'
import { codeOf } from './limit-errors'

describe('codeOf', () => {
  it('reads the code', () => expect(codeOf({ code: 'SC001' })).toBe('SC001'))
  it('is undefined without one', () => {
    expect(codeOf({})).toBeUndefined()
    expect(codeOf(null)).toBeUndefined()
    expect(codeOf('SC001')).toBeUndefined()
  })
})
