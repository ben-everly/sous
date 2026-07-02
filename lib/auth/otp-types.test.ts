import { describe, expect, it } from 'vitest'
import { OTP_TYPES } from './otp-types'

describe('OTP_TYPES', () => {
  it('pins the verified signup OTP type', () => {
    expect(OTP_TYPES.signup).toBe('signup')
  })
  it('pins the recovery OTP type', () => {
    expect(OTP_TYPES.recovery).toBe('recovery')
  })
})
