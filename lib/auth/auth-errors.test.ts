import { describe, expect, it } from 'vitest'
import { authErrorMessage } from './auth-errors'

describe('authErrorMessage', () => {
  it('maps invalid_credentials to generic, non-enumerating copy', () => {
    expect(authErrorMessage({ code: 'invalid_credentials' })).toMatch(/incorrect/i)
  })
  it('maps over_email_send_rate_limit to a try-again-shortly message', () => {
    expect(authErrorMessage({ code: 'over_email_send_rate_limit' })).toMatch(/try again/i)
  })
  it('maps weak_password to the length hint', () => {
    expect(authErrorMessage({ code: 'weak_password' })).toMatch(/8 characters/i)
  })
  it('maps user_already_exists without confirming the account exists', () => {
    const msg = authErrorMessage({ code: 'user_already_exists' })
    expect(msg).toMatch(/sign in|reset/i)
  })
  it('falls back to a generic message for an unknown code', () => {
    expect(authErrorMessage({ code: 'something_new' })).toMatch(/something went wrong/i)
  })
  it('falls back to generic when no code is present', () => {
    expect(authErrorMessage(null)).toMatch(/something went wrong/i)
  })
})
