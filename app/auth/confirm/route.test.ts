import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'
import { GET } from './route'

const verifyOtp = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { verifyOtp } })),
}))
vi.mock('next/server', () => ({
  NextResponse: { redirect: vi.fn((url: string) => ({ __redirect: url })) },
}))

const mockedRedirect = vi.mocked(NextResponse.redirect)
const get = (params: string) => GET(new Request(`http://localhost:3000/auth/confirm${params}`))

describe('email confirmation (GET)', () => {
  beforeEach(() => {
    mockedRedirect.mockClear()
    verifyOtp.mockReset()
  })

  it('verifies a signup token and redirects home', async () => {
    verifyOtp.mockResolvedValue({ error: null })
    await get('?token_hash=abc')
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc', type: 'signup' })
    expect(mockedRedirect).toHaveBeenCalledWith('http://localhost:3000/')
  })

  it('ignores a recovery type in the URL and still verifies as signup', async () => {
    verifyOtp.mockResolvedValue({ error: null })
    await get('?token_hash=abc&type=recovery')
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc', type: 'signup' })
    expect(mockedRedirect).toHaveBeenCalledWith('http://localhost:3000/')
  })

  it('redirects to the confirmation_invalid notice when token_hash is missing', async () => {
    await get('')
    expect(verifyOtp).not.toHaveBeenCalled()
    expect(mockedRedirect).toHaveBeenCalledWith(
      'http://localhost:3000/login?error=confirmation_invalid',
    )
  })

  it('redirects to the confirmation_invalid notice on a failed verify', async () => {
    verifyOtp.mockResolvedValue({ error: { code: 'otp_expired' } })
    await get('?token_hash=expired')
    expect(mockedRedirect).toHaveBeenCalledWith(
      'http://localhost:3000/login?error=confirmation_invalid',
    )
  })
})
