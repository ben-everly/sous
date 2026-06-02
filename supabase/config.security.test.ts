import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'smol-toml'
import { describe, expect, it } from 'vitest'

// The base config leaves skip_nonce_check and both signup switches open for local
// dev / E2E seeding. A [remotes.<name>] overlay inherits those insecure values
// unless it overrides them, so this fails CI if a remote doesn't close them.
const configPath = resolve(process.cwd(), 'supabase/config.toml')
const config = parse(readFileSync(configPath, 'utf8')) as {
  remotes?: Record<
    string,
    {
      auth?: {
        enable_signup?: boolean
        email?: { enable_signup?: boolean }
        external?: { google?: { skip_nonce_check?: boolean } }
      }
    }
  >
}

const remotes = Object.entries(config.remotes ?? {})

describe('remote auth security overrides', () => {
  it.each(remotes)('[remotes.%s] disables Google skip_nonce_check', (_name, remote) => {
    expect(remote.auth?.external?.google?.skip_nonce_check).toBe(false)
  })

  it.each(remotes)('[remotes.%s] disables global signup', (_name, remote) => {
    expect(remote.auth?.enable_signup).toBe(false)
  })

  it.each(remotes)('[remotes.%s] closes email self-registration', (_name, remote) => {
    expect(remote.auth?.email?.enable_signup).toBe(false)
  })

  // it.each above registers nothing until a remote exists, and Vitest errors on
  // a file with zero tests — so assert the config at least parsed.
  it('parses supabase/config.toml', () => {
    expect(config).toBeTypeOf('object')
  })
})
