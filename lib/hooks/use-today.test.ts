import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToday } from './use-today'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 17, 23, 59, 30))
})
afterEach(() => vi.useRealTimers())

describe('useToday', () => {
  it("returns today's local date", () => {
    expect(renderHook(() => useToday()).result.current).toBe('2026-10-17')
  })

  it('rolls over at midnight while the page stays visible', () => {
    const { result } = renderHook(() => useToday())
    act(() => void vi.advanceTimersByTime(60_000))
    expect(result.current).toBe('2026-10-18')
  })

  it('catches up when the tab is shown again', () => {
    const { result } = renderHook(() => useToday())
    vi.setSystemTime(new Date(2026, 9, 21, 9))
    act(() => void document.dispatchEvent(new Event('visibilitychange')))
    expect(result.current).toBe('2026-10-21')
  })
})
