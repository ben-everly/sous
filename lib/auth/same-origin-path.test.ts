import { describe, expect, it } from 'vitest'
import { sameOriginPath } from './same-origin-path'

describe('sameOriginPath', () => {
  it('keeps a relative same-origin path', () => {
    expect(sameOriginPath('/recipes/1')).toBe('/recipes/1')
    expect(sameOriginPath('/recipes?filter=fresh')).toBe('/recipes?filter=fresh')
    expect(sameOriginPath('/recipes#step-2')).toBe('/recipes#step-2')
  })

  it('falls back to / for a missing value', () => {
    expect(sameOriginPath(null)).toBe('/')
    expect(sameOriginPath(undefined)).toBe('/')
    expect(sameOriginPath('')).toBe('/')
  })

  it('rejects anything that resolves to another origin', () => {
    expect(sameOriginPath('https://evil.com')).toBe('/') // absolute URL
    expect(sameOriginPath('//evil.com')).toBe('/') // protocol-relative
    expect(sameOriginPath('/\\evil.com')).toBe('/') // backslash → //
    expect(sameOriginPath('/\t/evil.com')).toBe('/') // tab stripped → //
    expect(sameOriginPath('/\n/evil.com')).toBe('/') // newline stripped → //
  })

  it('normalizes a schemeless relative value to an on-origin path', () => {
    // "evil.com" is just a relative ref — it stays on our origin as /evil.com,
    // which is harmless (a 404 here), not an off-site redirect.
    expect(sameOriginPath('evil.com')).toBe('/evil.com')
  })
})
