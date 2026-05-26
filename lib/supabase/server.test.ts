import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createServerClient } from '@supabase/ssr'
import { createClient } from './server'
import { MOCK_SUPABASE_URL, MOCK_SUPABASE_PUBLISHABLE_KEY, type CookieHooks } from './test-utils'

let capturedCookies: CookieHooks | undefined

const cookieStore = {
  getAll: vi.fn(),
  set: vi.fn(),
}

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((_url: string, _key: string, options: { cookies: CookieHooks }) => {
    capturedCookies = options.cookies
    return { auth: {}, from: () => ({}) }
  }),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieStore),
}))

describe('Supabase server client', () => {
  beforeEach(() => {
    capturedCookies = undefined
    cookieStore.getAll.mockReset()
    cookieStore.set.mockReset()
    vi.mocked(createServerClient).mockClear()
  })

  it('initializes with the env URL and publishable key', async () => {
    const supabase = await createClient()

    expect(supabase).toBeDefined()
    expect(createServerClient).toHaveBeenCalledWith(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_PUBLISHABLE_KEY,
      expect.objectContaining({ cookies: expect.any(Object) }),
    )
  })

  it('forwards getAll() to the Next cookie store', async () => {
    const stored = [{ name: 'sb-access-token', value: 'abc', options: {} }]
    cookieStore.getAll.mockReturnValue(stored)

    await createClient()

    expect(capturedCookies?.getAll()).toBe(stored)
    expect(cookieStore.getAll).toHaveBeenCalledTimes(1)
  })

  it('forwards setAll() to cookieStore.set for each entry', async () => {
    await createClient()

    capturedCookies?.setAll([
      { name: 'a', value: '1', options: { httpOnly: true } },
      { name: 'b', value: '2', options: { secure: true } },
    ])

    expect(cookieStore.set).toHaveBeenCalledTimes(2)
    expect(cookieStore.set).toHaveBeenNthCalledWith(1, 'a', '1', { httpOnly: true })
    expect(cookieStore.set).toHaveBeenNthCalledWith(2, 'b', '2', { secure: true })
  })

  it('swallows errors thrown from cookieStore.set (Server Component context)', async () => {
    cookieStore.set.mockImplementation(() => {
      throw new Error('Cookies cannot be set in Server Components')
    })

    await createClient()

    expect(() => capturedCookies?.setAll([{ name: 'x', value: '1', options: {} }])).not.toThrow()
  })
})
