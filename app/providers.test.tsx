import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

const mocks = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { onAuthStateChange: mocks.onAuthStateChange } }),
}))

import { Providers } from './providers'

type Listener = (event: AuthChangeEvent, session: Session | null) => void

const sessionFor = (userId: string) => ({ user: { id: userId } }) as unknown as Session

let listener: Listener
let clearSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  mocks.onAuthStateChange.mockReset()
  mocks.unsubscribe.mockReset()
  mocks.onAuthStateChange.mockImplementation((cb: Listener) => {
    listener = cb
    return { data: { subscription: { unsubscribe: mocks.unsubscribe } } }
  })
  clearSpy = vi.spyOn(QueryClient.prototype, 'clear')
})

afterEach(() => vi.restoreAllMocks())

describe('Providers auth-boundary cache reset', () => {
  it('clears the query cache on SIGNED_OUT', () => {
    render(<Providers>app</Providers>)
    listener('INITIAL_SESSION', sessionFor('user-a'))
    clearSpy.mockClear()

    listener('SIGNED_OUT', null)

    expect(clearSpy).toHaveBeenCalledTimes(1)
  })

  it('clears the query cache when a different user signs in', () => {
    render(<Providers>app</Providers>)
    listener('INITIAL_SESSION', sessionFor('user-a'))
    clearSpy.mockClear()

    listener('SIGNED_IN', sessionFor('user-b'))

    expect(clearSpy).toHaveBeenCalledTimes(1)
  })

  it('does not clear on a token refresh for the same user', () => {
    render(<Providers>app</Providers>)
    listener('INITIAL_SESSION', sessionFor('user-a'))
    clearSpy.mockClear()

    listener('TOKEN_REFRESHED', sessionFor('user-a'))
    listener('SIGNED_IN', sessionFor('user-a'))

    expect(clearSpy).not.toHaveBeenCalled()
  })

  it('does not clear on the INITIAL_SESSION baseline event', () => {
    render(<Providers>app</Providers>)
    clearSpy.mockClear()

    listener('INITIAL_SESSION', sessionFor('user-a'))

    expect(clearSpy).not.toHaveBeenCalled()
  })

  it('unsubscribes from auth changes on unmount', () => {
    const { unmount } = render(<Providers>app</Providers>)
    unmount()
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1)
  })
})
