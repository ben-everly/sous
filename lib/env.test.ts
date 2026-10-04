// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const load = async (siteUrl: string) => {
  vi.stubEnv('SITE_URL', siteUrl)
  vi.resetModules()
  return (await import('@/lib/env')).env
}

describe('SITE_URL', () => {
  beforeEach(() => {
    vi.stubEnv('SUPABASE_SECRET_KEY', 'secret')
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('accepts a bare origin', async () => {
    expect((await load('https://app.example.com')).SITE_URL).toBe('https://app.example.com')
  })

  it.each(['https://app.example.com/', 'https://example.com/app'])(
    'rejects %s, which is not a bare origin',
    async (siteUrl) => {
      await expect(load(siteUrl)).rejects.toThrow('Invalid environment variables')
    },
  )
})
