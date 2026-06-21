import { describe, it, expect } from 'vitest'
import { isForgotPasswordError, RECOVERY_INVALID_URL } from './forgot-password-errors'

describe('isForgotPasswordError', () => {
  it('accepts recovery_invalid', () => {
    expect(isForgotPasswordError('recovery_invalid')).toBe(true)
  })

  it('rejects login-page error codes (wrong page)', () => {
    expect(isForgotPasswordError('cancelled')).toBe(false)
    expect(isForgotPasswordError('auth')).toBe(false)
  })

  it('rejects nullish and unknown values', () => {
    expect(isForgotPasswordError(null)).toBe(false)
    expect(isForgotPasswordError(undefined)).toBe(false)
    expect(isForgotPasswordError('whatever')).toBe(false)
  })
})

describe('RECOVERY_INVALID_URL', () => {
  it('points at the forgot-password page with the recovery_invalid notice', () => {
    expect(RECOVERY_INVALID_URL).toBe('/forgot-password?error=recovery_invalid')
  })
})
