import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from './proxy'
import type { CookieEntry, CookieHooks } from './test-utils'

type ResponseMock = { cookies: { set: ReturnType<typeof vi.fn> } }

const { responses } = vi.hoisted(() => ({ responses: [] as ResponseMock[] }))

let capturedCookies: CookieHooks | undefined
type GetClaimsResult = { data: { claims: { sub: string } | null } | null; error: null }
const getClaims = vi.fn<() => Promise<GetClaimsResult>>()

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((_url: string, _key: string, options: { cookies: CookieHooks }) => {
    capturedCookies = options.cookies
    return { auth: { getClaims } }
  }),
}))

vi.mock('next/server', () => ({
  NextResponse: {
    next: vi.fn(() => {
      const response: ResponseMock = { cookies: { set: vi.fn() } }
      responses.push(response)
      return response
    }),
  },
}))

const mockedNext = vi.mocked(NextResponse.next)

function makeRequest(initialCookies: CookieEntry[] = []) {
  return {
    cookies: {
      getAll: vi.fn(() => [...initialCookies]),
      set: vi.fn(),
    },
  }
}

describe('Supabase proxy (updateSession)', () => {
  beforeEach(() => {
    capturedCookies = undefined
    responses.length = 0
    mockedNext.mockClear()
    getClaims.mockReset()
    getClaims.mockResolvedValue({ data: { claims: null }, error: null })
  })

  it('returns the initial response when no cookies are set during refresh', async () => {
    const request = makeRequest()
    const response = await updateSession(request as unknown as NextRequest)

    expect(response).toBe(responses[0])
    expect(getClaims).toHaveBeenCalledTimes(1)
  })

  it('forwards getAll to request.cookies', async () => {
    const initial = [{ name: 'sb-access-token', value: 'tok', options: {} }]
    const request = makeRequest(initial)

    await updateSession(request as unknown as NextRequest)

    expect(capturedCookies?.getAll()).toEqual(initial)
    expect(request.cookies.getAll).toHaveBeenCalled()
  })

  it('setAll writes to request (no options) and a recreated response (with options)', async () => {
    const request = makeRequest()
    await updateSession(request as unknown as NextRequest)

    expect(mockedNext).toHaveBeenCalledTimes(1)

    capturedCookies?.setAll([
      { name: 'a', value: '1', options: { httpOnly: true } },
      { name: 'b', value: '2', options: { secure: true } },
    ])

    expect(request.cookies.set).toHaveBeenCalledTimes(2)
    expect(request.cookies.set).toHaveBeenNthCalledWith(1, 'a', '1')
    expect(request.cookies.set).toHaveBeenNthCalledWith(2, 'b', '2')

    expect(mockedNext).toHaveBeenCalledTimes(2)
    expect(responses[1].cookies.set).toHaveBeenCalledTimes(2)
    expect(responses[1].cookies.set).toHaveBeenNthCalledWith(1, 'a', '1', { httpOnly: true })
    expect(responses[1].cookies.set).toHaveBeenNthCalledWith(2, 'b', '2', { secure: true })

    expect(responses[0].cookies.set).not.toHaveBeenCalled()
  })

  it('returns the recreated response when cookies are set during refresh', async () => {
    getClaims.mockImplementation(async () => {
      capturedCookies?.setAll([
        { name: 'sb-access-token', value: 'refreshed', options: { httpOnly: true } },
      ])
      return { data: { claims: { sub: 'u' } }, error: null }
    })

    const request = makeRequest()
    const response = await updateSession(request as unknown as NextRequest)

    expect(mockedNext).toHaveBeenCalledTimes(2)
    expect(response).toBe(responses[1])
    expect(responses[1].cookies.set).toHaveBeenCalledWith('sb-access-token', 'refreshed', {
      httpOnly: true,
    })
  })
})
