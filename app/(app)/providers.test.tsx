import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query'
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

const renderProviders = () =>
  render(
    <Providers>
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
  it('clears the cache and refreshes on SIGNED_OUT without swapping clients', () => {
    renderProviders()
    emit('INITIAL_SESSION', sessionFor('user-a'))

    emit('SIGNED_OUT', null)

    expect(clearSpy).toHaveBeenCalledTimes(1)
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
    expect(clients.size).toBe(1)
  })

  it('swaps to a fresh client when a different user signs in', () => {
    renderProviders()
    emit('INITIAL_SESSION', sessionFor('user-a'))

    emit('SIGNED_IN', sessionFor('user-b'))

    expect(clients.size).toBe(2)
  })

  it('invalidates in place instead of swapping when an anon visitor signs in', () => {
    const invalidateSpy = vi.spyOn(QueryClient.prototype, 'invalidateQueries')
    renderProviders()
    emit('INITIAL_SESSION', null)

    emit('SIGNED_IN', sessionFor('user-a'))

    expect(invalidateSpy).toHaveBeenCalledTimes(1)
    expect(clients.size).toBe(1)
  })

  it('invalidates in place on the first sign-in after a sign-out', () => {
    const invalidateSpy = vi.spyOn(QueryClient.prototype, 'invalidateQueries')
    renderProviders()
    emit('INITIAL_SESSION', sessionFor('user-a'))
    emit('SIGNED_OUT', null)

    emit('SIGNED_IN', sessionFor('user-b'))

    expect(invalidateSpy).toHaveBeenCalledTimes(1)
    expect(clients.size).toBe(1)
  })

  it('does not swap on a token refresh for the same user', () => {
    renderProviders()
    emit('INITIAL_SESSION', sessionFor('user-a'))

    emit('TOKEN_REFRESHED', sessionFor('user-a'))
    emit('SIGNED_IN', sessionFor('user-a'))

    expect(clients.size).toBe(1)
  })

  it('does not swap on the INITIAL_SESSION baseline event', () => {
    renderProviders()

    emit('INITIAL_SESSION', sessionFor('user-a'))

    expect(clients.size).toBe(1)
  })

  it('does not swap when SIGNED_IN arrives before INITIAL_SESSION', () => {
    renderProviders()

    emit('SIGNED_IN', sessionFor('user-a'))
    emit('INITIAL_SESSION', sessionFor('user-a'))

    expect(clients.size).toBe(1)
  })

  it('keeps the baseline across the resubscribe that follows a swap', () => {
    renderProviders()
    emit('INITIAL_SESSION', sessionFor('user-a'))
    emit('SIGNED_IN', sessionFor('user-b'))

    emit('INITIAL_SESSION', sessionFor('user-b'))

    expect(clients.size).toBe(2)
  })

  it('refetches a query that was in flight when the user switched', async () => {
    const resolvers: ((v: string) => void)[] = []
    const Probe = () => {
      const { data } = useQuery({
        queryKey: ['probe'],
        queryFn: () => new Promise<string>((resolve) => resolvers.push(resolve)),
      })
      return <>{data ?? 'loading'}</>
    }
    render(
      <Providers>
        <Probe />
      </Providers>,
    )
    emit('INITIAL_SESSION', sessionFor('user-a'))
    await waitFor(() => expect(resolvers).toHaveLength(1))

    emit('SIGNED_IN', sessionFor('user-b'))
    await waitFor(() => expect(resolvers).toHaveLength(2))
    act(() => resolvers[0]('user-a data'))
    act(() => resolvers[1]('user-b data'))

    expect(await screen.findByText('user-b data')).toBeInTheDocument()
    expect(screen.queryByText('user-a data')).not.toBeInTheDocument()
  })

  it('unsubscribes from auth changes on unmount', () => {
    const { unmount } = renderProviders()
    unmount()
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1)
  })
})
