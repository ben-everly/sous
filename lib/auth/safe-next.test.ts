import { describe, expect, it } from 'vitest'
import { safeNext } from './safe-next'

describe('safeNext', () => {
  it('keeps a relative same-origin path', () => {
    expect(safeNext('/recipes/1')).toBe('/recipes/1')
    expect(safeNext('/recipes?filter=fresh')).toBe('/recipes?filter=fresh')
    expect(safeNext('/recipes#step-2')).toBe('/recipes#step-2')
  })

  it('falls back to / for a missing value', () => {
    expect(safeNext(null)).toBe('/')
    expect(safeNext(undefined)).toBe('/')
    expect(safeNext('')).toBe('/')
  })

  it('rejects anything that resolves to another origin', () => {
    expect(safeNext('https://evil.com')).toBe('/') // absolute URL
    expect(safeNext('//evil.com')).toBe('/') // protocol-relative
    expect(safeNext('/\\evil.com')).toBe('/') // backslash → //
    expect(safeNext('/\t/evil.com')).toBe('/') // tab stripped → //
    expect(safeNext('/\n/evil.com')).toBe('/') // newline stripped → //
  })

  it('normalizes a schemeless relative value to an on-origin path', () => {
    // "evil.com" is just a relative ref — it stays on our origin as /evil.com,
    // which is harmless (a 404 here), not an off-site redirect.
    expect(safeNext('evil.com')).toBe('/evil.com')
  })
})
