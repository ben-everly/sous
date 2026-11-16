import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, useQueryClient } from '@tanstack/react-query'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

const mocks = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { onAuthStateChange: mocks.onAuthStateChange } }),
}))

import { Providers } from './providers'

type Listener = (event: AuthChangeEvent, session: Session | null) => void

const sessionFor = (userId: string) => ({ user: { id: userId } }) as unknown as Session

let listener: Listener
let clearSpy: ReturnType<typeof vi.spyOn>
const clients = new Set<QueryClient>()

const ClientProbe = () => {
  clients.add(useQueryClient())
  return null
}

const renderProviders = (userId = 'user-a') =>
  render(
    <Providers key={userId} userId={userId}>
      <ClientProbe />
    </Providers>,
  )

const emit = (event: AuthChangeEvent, session: Session | null) =>
  act(() => listener(event, session))

beforeEach(() => {
  mocks.onAuthStateChange.mockReset()
  mocks.unsubscribe.mockReset()
  mocks.refresh.mockReset()
  mocks.onAuthStateChange.mockImplementation((cb: Listener) => {
    listener = cb
    return { data: { subscription: { unsubscribe: mocks.unsubscribe } } }
  })
  clearSpy = vi.spyOn(QueryClient.prototype, 'clear')
  clients.clear()
})

afterEach(() => vi.restoreAllMocks())

describe('Providers auth-boundary cache isolation', () => {
  it('clears the cache and refreshes on SIGNED_OUT', () => {
    renderProviders()

    emit('SIGNED_OUT', null)

    expect(clearSpy).toHaveBeenCalledTimes(1)
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
    expect(clients.size).toBe(1)
  })

  it('clears and refreshes without swapping clients when the session is another user', () => {
    renderProviders()

    emit('SIGNED_IN', sessionFor('user-b'))

    expect(mocks.refresh).toHaveBeenCalledTimes(1)
    expect(clearSpy).toHaveBeenCalledTimes(1)
    expect(clients.size).toBe(1)
  })

  it('does nothing for same-user events', () => {
    renderProviders()

    emit('INITIAL_SESSION', sessionFor('user-a'))
    emit('TOKEN_REFRESHED', sessionFor('user-a'))
    emit('SIGNED_IN', sessionFor('user-a'))

    expect(mocks.refresh).not.toHaveBeenCalled()
    expect(clearSpy).not.toHaveBeenCalled()
    expect(clients.size).toBe(1)
  })

  it('does nothing for a null session other than SIGNED_OUT', () => {
    renderProviders()

    emit('INITIAL_SESSION', null)

    expect(mocks.refresh).not.toHaveBeenCalled()
    expect(clearSpy).not.toHaveBeenCalled()
  })

  it('gives a fresh client when re-rendered with a new key', () => {
    const { rerender } = renderProviders()

    rerender(
      <Providers key="user-b" userId="user-b">
        <ClientProbe />
      </Providers>,
    )

    expect(clients.size).toBe(2)
  })

  it('unsubscribes from auth changes on unmount', () => {
    const { unmount } = renderProviders()
    unmount()
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1)
  })
})
