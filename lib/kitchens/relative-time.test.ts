import { describe, expect, it } from 'vitest'
import { relativeTime } from './relative-time'

const now = new Date('2026-06-19T12:00:00Z')

describe('relativeTime', () => {
  it('formats the current moment as "now"', () => {
    // numeric: 'auto' yields "now" only for a 0 delta — a freshly-deleted item (deleted_at ≈ now).
    expect(relativeTime('2026-06-19T12:00:00Z', now)).toBe('now')
  })

  it('formats a few seconds ago in seconds', () => {
    expect(relativeTime('2026-06-19T11:59:58Z', now)).toBe('2 seconds ago')
  })

  it('formats minutes ago', () => {
    expect(relativeTime('2026-06-19T11:58:00Z', now)).toBe('2 minutes ago')
  })

  it('formats hours ago', () => {
    expect(relativeTime('2026-06-19T09:00:00Z', now)).toBe('3 hours ago')
  })

  it('formats days ago', () => {
    expect(relativeTime('2026-06-16T12:00:00Z', now)).toBe('3 days ago')
  })
})
