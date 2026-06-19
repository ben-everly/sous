import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSignOut } from './use-sign-out'

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signOut: mocks.signOut } }),
}))
vi.mock('sonner', () => ({ toast: { error: mocks.toastError } }))

describe('useSignOut', () => {
  beforeEach(() => {
    mocks.signOut.mockReset()
    mocks.replace.mockReset()
    mocks.refresh.mockReset()
    mocks.toastError.mockReset()
  })

  afterEach(() => vi.clearAllMocks())

  it('navigates to /login and refreshes on success, staying pending through the nav', async () => {
    mocks.signOut.mockResolvedValue({ error: null })
    const { result } = renderHook(() => useSignOut())

    await act(async () => {
      await result.current.signOut()
    })

    expect(mocks.replace).toHaveBeenCalledWith('/login')
    expect(mocks.refresh).toHaveBeenCalled()
    // No reset on success — the spinner persists while the page navigates away.
    expect(result.current.pending).toBe(true)
  })

  it('does not navigate, re-enables, and toasts on failure', async () => {
    mocks.signOut.mockResolvedValue({ error: { message: 'network' } })
    const { result } = renderHook(() => useSignOut())

    await act(async () => {
      await result.current.signOut()
    })

    expect(mocks.replace).not.toHaveBeenCalled()
    expect(mocks.refresh).not.toHaveBeenCalled()
    expect(mocks.toastError).toHaveBeenCalledWith("Couldn't sign you out. Try again.")
    expect(result.current.pending).toBe(false)
  })
})
