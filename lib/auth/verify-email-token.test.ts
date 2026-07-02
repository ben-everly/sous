import { beforeEach, describe, expect, it, vi } from 'vitest'
import { verifyEmailToken } from './verify-email-token'
import { OTP_TYPES } from './otp-types'

const verifyOtp = vi.fn()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = { auth: { verifyOtp } } as any

beforeEach(() => verifyOtp.mockReset())

describe('verifyEmailToken', () => {
  it('verifies with the token_hash flow and returns ok on success', async () => {
    verifyOtp.mockResolvedValue({ error: null })
    await expect(
      verifyEmailToken(supabase, { tokenHash: 't', type: OTP_TYPES.signup }),
    ).resolves.toEqual({ ok: true })
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 't', type: 'signup' })
  })

  it('returns the error on a failed verify', async () => {
    const error = { code: 'otp_expired', message: 'expired' }
    verifyOtp.mockResolvedValue({ error })
    await expect(
      verifyEmailToken(supabase, { tokenHash: 't', type: OTP_TYPES.recovery }),
    ).resolves.toEqual({ ok: false, error })
  })
})
