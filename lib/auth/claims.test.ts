import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { getClaimsFrom } from './claims'

const clientWith = (getClaims: ReturnType<typeof vi.fn>) =>
  ({ auth: { getClaims } }) as unknown as SupabaseClient<Database>

describe('getClaimsFrom', () => {
  it('returns the claims when a session is present', async () => {
    const supabase = clientWith(
      vi.fn().mockResolvedValue({ data: { claims: { sub: 'u' } }, error: null }),
    )
    await expect(getClaimsFrom(supabase)).resolves.toEqual({ sub: 'u' })
  })

  it('returns null when there is no session', async () => {
    const supabase = clientWith(vi.fn().mockResolvedValue({ data: null, error: null }))
    await expect(getClaimsFrom(supabase)).resolves.toBeNull()
  })

  it('fails secure: returns null when getClaims throws', async () => {
    const supabase = clientWith(vi.fn().mockRejectedValue(new Error('network')))
    await expect(getClaimsFrom(supabase)).resolves.toBeNull()
  })

  it('fails secure: returns null on a returned error even if claims are present', async () => {
    const supabase = clientWith(
      vi.fn().mockResolvedValue({ data: { claims: { sub: 'u' } }, error: { message: 'stale' } }),
    )
    await expect(getClaimsFrom(supabase)).resolves.toBeNull()
  })
})
