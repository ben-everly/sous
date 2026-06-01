import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requireClaims } from './claims'

const getClaims = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getClaims } })),
}))

describe('requireClaims', () => {
  beforeEach(() => {
    getClaims.mockReset()
  })

  it('returns the claims when a session is present', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'u' } }, error: null })
    await expect(requireClaims()).resolves.toEqual({ sub: 'u' })
  })

  it('throws when getClaims returns an error, even with claims present', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'u' } }, error: { message: 'bad' } })
    await expect(requireClaims()).rejects.toThrow(/no session/i)
  })

  it('throws when there is no session', async () => {
    getClaims.mockResolvedValue({ data: null, error: null })
    await expect(requireClaims()).rejects.toThrow(/no session/i)
  })
})
