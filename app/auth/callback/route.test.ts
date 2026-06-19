import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'
import { GET } from './route'

const exchangeCodeForSession = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { exchangeCodeForSession } })),
}))

vi.mock('next/server', () => ({
  NextResponse: { redirect: vi.fn((url: string) => ({ __redirect: url })) },
}))

const mockedRedirect = vi.mocked(NextResponse.redirect)

const get = (params: string) => GET(new Request(`http://localhost:3000/auth/callback${params}`))

describe('OAuth callback (GET)', () => {
  beforeEach(() => {
    mockedRedirect.mockClear()
    exchangeCodeForSession.mockReset()
  })

  it('maps a denied consent to the cancelled notice without exchanging', async () => {
    await get('?error=access_denied')

    expect(mockedRedirect).toHaveBeenCalledWith('http://localhost:3000/login?error=cancelled')
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('preserves next through the cancelled redirect for retry', async () => {
    await get(`?error=access_denied&next=${encodeURIComponent('/recipes/42')}`)

    expect(mockedRedirect).toHaveBeenCalledWith(
      `http://localhost:3000/login?${new URLSearchParams({ error: 'cancelled', next: '/recipes/42' })}`,
    )
  })

  it('preserves next through the auth-error redirect for retry', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    exchangeCodeForSession.mockResolvedValue({ error: { message: 'bad code' } })

    await get(`?code=abc&next=${encodeURIComponent('/recipes/42')}`)

    expect(mockedRedirect).toHaveBeenCalledWith(
      `http://localhost:3000/login?${new URLSearchParams({ error: 'auth', next: '/recipes/42' })}`,
    )
    consoleError.mockRestore()
  })

  it('drops an off-origin next from the cancelled redirect', async () => {
    await get(`?error=access_denied&next=${encodeURIComponent('//evil.com')}`)

    expect(mockedRedirect).toHaveBeenCalledWith('http://localhost:3000/login?error=cancelled')
  })

  it('drops an off-origin next from the auth-error redirect', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    exchangeCodeForSession.mockResolvedValue({ error: { message: 'bad code' } })

    await get(`?code=abc&next=${encodeURIComponent('https://evil.test/x')}`)

    expect(mockedRedirect).toHaveBeenCalledWith('http://localhost:3000/login?error=auth')
    consoleError.mockRestore()
  })

  it('redirects a missing code to the auth error', async () => {
    await get('')

    expect(mockedRedirect).toHaveBeenCalledWith('http://localhost:3000/login?error=auth')
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('redirects a failed exchange to the auth error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    exchangeCodeForSession.mockResolvedValue({ error: { message: 'bad code' } })

    await get('?code=abc')

    expect(exchangeCodeForSession).toHaveBeenCalledWith('abc')
    expect(mockedRedirect).toHaveBeenCalledWith('http://localhost:3000/login?error=auth')
    consoleError.mockRestore()
  })

  it('logs a non-access_denied provider error before the auth redirect', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    await get('?error=redirect_uri_mismatch&error_description=bad+uri')

    expect(consoleError).toHaveBeenCalledWith(
      'OAuth provider error:',
      'redirect_uri_mismatch',
      'bad uri',
    )
    expect(mockedRedirect).toHaveBeenCalledWith('http://localhost:3000/login?error=auth')
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('sends a failed recovery exchange to /forgot-password?error=recovery_invalid', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    exchangeCodeForSession.mockResolvedValue({ error: { message: 'expired' } })
    await GET(
      new Request(
        'http://localhost:3000/auth/callback?code=abc&next=' +
          encodeURIComponent('/reset-password'),
      ),
    )
    expect(mockedRedirect).toHaveBeenCalledWith(
      'http://localhost:3000/forgot-password?error=recovery_invalid',
    )
    consoleError.mockRestore()
  })

  it('lands a successful exchange on / when no next is present', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null })

    await get('?code=abc')

    expect(mockedRedirect).toHaveBeenCalledWith('http://localhost:3000/')
  })

  // sameOriginPath is deliberately unmocked — these lock the route→guard wiring.
  it('returns the user to a same-origin next path', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null })

    await get(`?code=abc&next=${encodeURIComponent('/recipes/42?tab=steps')}`)

    expect(mockedRedirect).toHaveBeenCalledWith('http://localhost:3000/recipes/42?tab=steps')
  })

  it('drops an off-origin next to /', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null })

    await get(`?code=abc&next=${encodeURIComponent('//evil.com')}`)

    expect(mockedRedirect).toHaveBeenCalledWith('http://localhost:3000/')
  })
})
