import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedValue } from './use-debounced-value'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useDebouncedValue', () => {
  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('a', 250))
    expect(result.current).toBe('a')
  })

  it('updates only after the value has been stable for ms', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 250), {
      initialProps: { v: 'a' },
    })
    rerender({ v: 'b' })
    act(() => void vi.advanceTimersByTime(200))
    rerender({ v: 'c' })
    act(() => void vi.advanceTimersByTime(200))
    expect(result.current).toBe('a')
    act(() => void vi.advanceTimersByTime(50))
    expect(result.current).toBe('c')
  })
})
