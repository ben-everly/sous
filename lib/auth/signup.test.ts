import { describe, expect, it } from 'vitest'
import { classifySignupResult } from './signup'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const result = (data: any) => classifySignupResult(data)

describe('classifySignupResult', () => {
  // GoTrue obfuscates a signup for an already-registered email as a user with an empty
  // identities array (independent of the confirmations setting).
  it("is 'existing' when identities is empty (obfuscated duplicate)", () => {
    expect(result({ user: { identities: [] }, session: null })).toBe('existing')
  })

  it("is 'authed' when a session is returned", () => {
    expect(result({ user: { identities: [{ id: '1' }] }, session: { access_token: 't' } })).toBe(
      'authed',
    )
  })

  // Confirmations on: a genuine new signup is sessionless but has identities.
  it("is 'awaiting_confirmation' for a new signup with identities and no session", () => {
    expect(result({ user: { identities: [{ id: '1' }] }, session: null })).toBe(
      'awaiting_confirmation',
    )
  })

  // An empty-identities duplicate is 'existing' even if a session were somehow present —
  // the duplicate check must win over the session check.
  it("prefers 'existing' over 'authed' when identities is empty", () => {
    expect(result({ user: { identities: [] }, session: { access_token: 't' } })).toBe('existing')
  })
})
