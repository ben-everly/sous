import { describe, expect, it } from 'vitest'
import { backoffMs, mementoTimestamp, parseRetryAfter } from './http'

describe('mementoTimestamp', () => {
  it('converts a Memento-Datetime header to a CDX timestamp', () => {
    expect(mementoTimestamp('Tue, 26 Nov 2024 23:52:34 GMT')).toBe('20241126235234')
  })

  it('returns null when the header is absent or unparseable', () => {
    expect(mementoTimestamp(null)).toBeNull()
    expect(mementoTimestamp('whenever')).toBeNull()
  })
})

describe('parseRetryAfter', () => {
  it('reads a delay in seconds', () => {
    expect(parseRetryAfter('30', 1000)).toBe(30_000)
  })

  it('reads an HTTP date as a delay from now', () => {
    expect(parseRetryAfter(new Date(Date.now() + 20_000).toUTCString(), 1000)).toBeGreaterThan(
      15_000,
    )
  })

  it('backs off rather than retrying instantly on a zero or past-dated delay', () => {
    expect(parseRetryAfter('Tue, 26 Nov 2024 23:52:34 GMT', 1000)).toBe(1000)
    expect(parseRetryAfter('0', 1000)).toBe(1000)
  })

  it('falls back when the header is missing or junk', () => {
    expect(parseRetryAfter(null, 1000)).toBe(1000)
    expect(parseRetryAfter('soon', 1000)).toBe(1000)
  })

  it('caps an outsized delay so one Retry-After cannot stall the run for hours', () => {
    expect(parseRetryAfter('3600', 1000)).toBe(30_000)
    expect(parseRetryAfter(new Date(Date.now() + 3_600_000).toUTCString(), 1000)).toBe(30_000)
  })
})

describe('backoffMs', () => {
  it('doubles per attempt up to the cap', () => {
    expect([1, 2, 3, 4, 10].map((attempt) => backoffMs(attempt))).toEqual([
      2000, 4000, 8000, 16000, 30000,
    ])
  })
})
