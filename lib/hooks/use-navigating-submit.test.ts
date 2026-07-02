import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useNavigatingSubmit } from './use-navigating-submit'

describe('useNavigatingSubmit', () => {
  it('passes isSubmitting through as pending before any navigation', () => {
    const { result, rerender } = renderHook(({ s }) => useNavigatingSubmit(s), {
      initialProps: { s: false },
    })
    expect(result.current.pending).toBe(false)
    rerender({ s: true })
    expect(result.current.pending).toBe(true)
  })

  it('latches pending once startNavigating fires, even after isSubmitting resets', () => {
    const { result, rerender } = renderHook(({ s }) => useNavigatingSubmit(s), {
      initialProps: { s: true },
    })
    act(() => result.current.startNavigating())
    rerender({ s: false })
    expect(result.current.pending).toBe(true)
  })
})
