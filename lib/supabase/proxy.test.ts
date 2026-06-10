import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from './proxy'
import type { CookieEntry, CookieHooks } from './test-utils'

type ResponseMock = { cookies: { set: ReturnType<typeof vi.fn> } }

const { responses } = vi.hoisted(() => ({ responses: [] as ResponseMock[] }))

let capturedCookies: CookieHooks | undefined
type GetClaimsResult = {
  data: { claims: { sub: string } | null } | null
  error: { message: string } | null
}
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
    redirect: vi.fn((url: { pathname: string }) => ({ __redirect: url })),
  },
}))

const mockedNext = vi.mocked(NextResponse.next)
const mockedRedirect = vi.mocked(NextResponse.redirect)

function makeRequest({
  cookies = [] as CookieEntry[],
  pathname = '/',
  search = '',
}: { cookies?: CookieEntry[]; pathname?: string; search?: string } = {}) {
  return {
    url: `http://localhost:3000${pathname}${search}`,
    cookies: {
      getAll: vi.fn(() => [...cookies]),
      set: vi.fn(),
    },
    nextUrl: { pathname, search },
  }
}

const authed = () => getClaims.mockResolvedValue({ data: { claims: { sub: 'u' } }, error: null })

describe('Supabase proxy (updateSession)', () => {
  beforeEach(() => {
    capturedCookies = undefined
    responses.length = 0
    mockedNext.mockClear()
    mockedRedirect.mockClear()
    getClaims.mockReset()
    getClaims.mockResolvedValue({ data: { claims: null }, error: null })
  })

  it('returns the initial response when no cookies are set during refresh', async () => {
    authed()
    const request = makeRequest()
    const response = await updateSession(request as unknown as NextRequest)

    expect(response).toBe(responses[0])
    expect(getClaims).toHaveBeenCalledTimes(1)
  })

  it('forwards getAll to request.cookies', async () => {
    authed()
    const initial = [{ name: 'sb-access-token', value: 'tok', options: {} }]
    const request = makeRequest({ cookies: initial })

    await updateSession(request as unknown as NextRequest)

    expect(capturedCookies?.getAll()).toEqual(initial)
    expect(request.cookies.getAll).toHaveBeenCalled()
  })

  it('setAll writes to request (no options) and a recreated response (with options)', async () => {
    authed()
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

  it("returns the recreated response when getClaims's setAll runs during refresh", async () => {
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
    expect(mockedRedirect).not.toHaveBeenCalled()
  })

  it('redirects an unauthenticated request to /login', async () => {
    const request = makeRequest({ pathname: '/dashboard' })
    const response = await updateSession(request as unknown as NextRequest)

    expect(mockedRedirect).toHaveBeenCalledTimes(1)
    expect(mockedRedirect.mock.calls[0][0]).toMatchObject({ pathname: '/login' })
    expect(response).toMatchObject({ __redirect: { pathname: '/login' } })
  })

  it('preserves the attempted path (and query) as ?next on the login redirect', async () => {
    const request = makeRequest({ pathname: '/recipes/1', search: '?sort=new' })
    await updateSession(request as unknown as NextRequest)

    const url = mockedRedirect.mock.calls[0][0] as unknown as { searchParams: URLSearchParams }
    expect(url.searchParams.get('next')).toBe('/recipes/1?sort=new')
  })

  it('omits ?next when the attempted path is /', async () => {
    const request = makeRequest({ pathname: '/' })
    await updateSession(request as unknown as NextRequest)

    const url = mockedRedirect.mock.calls[0][0] as unknown as { searchParams: URLSearchParams }
    expect(url.searchParams.get('next')).toBeNull()
  })

  it('lets an unauthenticated request through to /login', async () => {
    const request = makeRequest({ pathname: '/login' })
    const response = await updateSession(request as unknown as NextRequest)

    expect(mockedRedirect).not.toHaveBeenCalled()
    expect(response).toBe(responses[0])
  })

  it('lets an unauthenticated request through to the /auth/* subtree', async () => {
    const request = makeRequest({ pathname: '/auth/callback' })
    const response = await updateSession(request as unknown as NextRequest)

    expect(mockedRedirect).not.toHaveBeenCalled()
    expect(response).toBe(responses[0])
  })

  it('lets an authenticated request through to a protected route', async () => {
    authed()
    const request = makeRequest({ pathname: '/dashboard' })
    const response = await updateSession(request as unknown as NextRequest)

    expect(mockedRedirect).not.toHaveBeenCalled()
    expect(response).toBe(responses[0])
  })

  it('fails secure: a thrown getClaims() redirects to /login', async () => {
    getClaims.mockRejectedValue(new Error('network'))
    const request = makeRequest({ pathname: '/dashboard' })
    const response = await updateSession(request as unknown as NextRequest)

    expect(mockedRedirect).toHaveBeenCalledTimes(1)
    expect(mockedRedirect.mock.calls[0][0]).toMatchObject({ pathname: '/login' })
    expect(response).toMatchObject({ __redirect: { pathname: '/login' } })
  })

  it('fails secure: a returned error wins even if claims are present', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'u' } }, error: { message: 'stale' } })
    const request = makeRequest({ pathname: '/dashboard' })
    const response = await updateSession(request as unknown as NextRequest)

    expect(mockedRedirect).toHaveBeenCalledTimes(1)
    expect(mockedRedirect.mock.calls[0][0]).toMatchObject({ pathname: '/login' })
    expect(response).toMatchObject({ __redirect: { pathname: '/login' } })
  })

  it('treats /login/anything as NOT public (exact match for /login)', async () => {
    const request = makeRequest({ pathname: '/login/anything' })
    await updateSession(request as unknown as NextRequest)

    expect(mockedRedirect).toHaveBeenCalledTimes(1)
    expect(mockedRedirect.mock.calls[0][0]).toMatchObject({ pathname: '/login' })
  })
})
