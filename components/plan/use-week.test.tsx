import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ search: '' }))

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(mocks.search) }))

import { useWeek } from './use-week'

const TODAY = '2026-10-16'

beforeEach(() => {
  mocks.search = ''
  vi.spyOn(window.history, 'replaceState')
  vi.spyOn(window.history, 'pushState')
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('useWeek', () => {
  it('uses a valid param as-is, even off the locale week', () => {
    mocks.search = 'week=2026-10-14'
    const { result } = renderHook(() => useWeek(TODAY))
    expect(result.current.start).toBe('2026-10-14')
    expect(result.current.dates).toEqual([
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
      '2026-10-19',
      '2026-10-20',
    ])
    expect(window.history.replaceState).not.toHaveBeenCalled()
  })

  it.each(['', '&week=nope', '&week=2026-02-30'])(
    'falls back to the locale week and writes it for %j',
    (search) => {
      mocks.search = `x=1${search}`
      const { result } = renderHook(() => useWeek(TODAY))
      expect(result.current.dates).toHaveLength(7)
      expect(result.current.dates).toContain(TODAY)
      expect(window.history.replaceState).toHaveBeenCalledWith(
        null,
        '',
        `?x=1&week=${result.current.start}`,
      )
    },
  )

  it('pushes a history entry on go', () => {
    mocks.search = 'week=2026-10-11'
    const { result } = renderHook(() => useWeek(TODAY))
    result.current.go('2026-10-18')
    expect(window.history.pushState).toHaveBeenCalledWith(null, '', '?week=2026-10-18')
  })
})
