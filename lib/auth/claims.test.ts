import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getClaims } from './claims'

const getClaimsMock = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getClaims: getClaimsMock } })),
}))

describe('getClaims', () => {
  beforeEach(() => {
    getClaimsMock.mockReset()
  })

  it('returns the claims when a session is present', async () => {
    getClaimsMock.mockResolvedValue({ data: { claims: { sub: 'u' } }, error: null })
    await expect(getClaims()).resolves.toEqual({ sub: 'u' })
  })

  it('returns null when there is no session', async () => {
    getClaimsMock.mockResolvedValue({ data: null, error: null })
    await expect(getClaims()).resolves.toBeNull()
  })
})
