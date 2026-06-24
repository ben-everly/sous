import { describe, expect, it } from 'vitest'
import { isExistingAccountSignup } from './signup'

// GoTrue obfuscates a signup for an already-registered email as a user with an empty
// identities array (independent of the confirmations setting). This predicate documents
// that contract.
describe('isExistingAccountSignup', () => {
  it('is true when identities is empty (obfuscated duplicate)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isExistingAccountSignup({ user: { identities: [] } as any, session: null })).toBe(true)
  })
  it('is false for a genuine new signup with identities', () => {
    expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      isExistingAccountSignup({ user: { identities: [{ id: '1' }] } as any, session: null }),
    ).toBe(false)
  })
  it('is false when user is null', () => {
    expect(isExistingAccountSignup({ user: null, session: null })).toBe(false)
  })
})
