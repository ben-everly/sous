import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { COOLDOWN_MS, markResendSent, resendCooldownRemainingMs } from '@/lib/auth/resend-cooldown'

afterEach(() => localStorage.clear())

describe('resend cooldown store', () => {
  it('returns no remaining time for an address that was never sent to', () => {
    expect(resendCooldownRemainingMs('a@b.com', 0)).toBe(0)
  })

  it('reports the full window right after a send, then counts down to zero', () => {
    markResendSent('a@b.com', 1_000)
    expect(resendCooldownRemainingMs('a@b.com', 1_000)).toBe(COOLDOWN_MS)
    expect(resendCooldownRemainingMs('a@b.com', 1_000 + COOLDOWN_MS / 2)).toBe(COOLDOWN_MS / 2)
    expect(resendCooldownRemainingMs('a@b.com', 1_000 + COOLDOWN_MS)).toBe(0)
    expect(resendCooldownRemainingMs('a@b.com', 1_000 + COOLDOWN_MS + 5_000)).toBe(0)
  })

  it('never reports more than the full window, even if the clock moved backwards', () => {
    markResendSent('a@b.com', 1_000)
    // Query at an earlier `now` (device clock moved back / skew) — must clamp, not exceed.
    expect(resendCooldownRemainingMs('a@b.com', 500)).toBe(COOLDOWN_MS)
  })

  it('keys the cooldown by a normalized address, so casing/whitespace can not dodge it', () => {
    markResendSent('  A@B.com ', 0)
    expect(resendCooldownRemainingMs('a@b.com', 0)).toBe(COOLDOWN_MS)
  })

  // The window must match GoTrue's max_frequency, or the UI re-enables before the server
  // will accept another send. [auth.sms] has its own max_frequency, so scope to [auth.email].
  it('keeps max_frequency in config.toml equal to COOLDOWN_MS', () => {
    const config = readFileSync(resolve(process.cwd(), 'supabase/config.toml'), 'utf8')
    const afterHeader = config.slice(config.indexOf('[auth.email]') + '[auth.email]'.length)
    const nextSection = afterHeader.search(/^\[/m)
    const emailSection = nextSection === -1 ? afterHeader : afterHeader.slice(0, nextSection)
    const match = emailSection.match(/^max_frequency\s*=\s*"(\d+)s"/m)
    expect(match, 'max_frequency not found in [auth.email]').not.toBeNull()
    expect(Number(match![1]) * 1000).toBe(COOLDOWN_MS)
  })
})
