import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { classifySignupResult } from './signup'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const result = (data: any) => classifySignupResult(data)

describe('classifySignupResult', () => {
  // Independent of the confirmations setting.
  it("is 'existing' when identities is empty (obfuscated duplicate)", () => {
    expect(result({ user: { identities: [] }, session: null })).toBe('existing')
  })

  it("is 'authed' when a session is returned", () => {
    expect(result({ user: { identities: [{ id: '1' }] }, session: { access_token: 't' } })).toBe(
      'authed',
    )
  })

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

  // The 'authed' branch's safety rests on confirmations being on: with them off, a brand-new
  // unconfirmed signup returns a session and gets logged straight in. Fail loudly if the
  // config ever drifts, so that change can't ship without revisiting register-form.
  it('keeps email confirmations enabled in config.toml', () => {
    const config = readFileSync(resolve(process.cwd(), 'supabase/config.toml'), 'utf8')
    expect(config).toMatch(/^enable_confirmations = true$/m)
  })
})
