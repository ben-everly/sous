import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { getUserFrom } from './user'

type ProfileResult = { data: unknown; error: unknown }

const clientWith = (claims: unknown, profile: ProfileResult) => {
  const maybeSingle = vi.fn().mockResolvedValue(profile)
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  return {
    auth: {
      getClaims: vi.fn().mockResolvedValue({ data: claims ? { claims } : null, error: null }),
    },
    from,
  } as unknown as SupabaseClient<Database>
}

describe('getUserFrom', () => {
  it('returns claims and profile when both are present', async () => {
    const supabase = clientWith(
      { sub: 'u' },
      { data: { display_name: 'Ada', avatar_url: 'https://x/a.png' }, error: null },
    )
    await expect(getUserFrom(supabase)).resolves.toEqual({
      claims: { sub: 'u' },
      profile: { display_name: 'Ada', avatar_url: 'https://x/a.png' },
      profileError: false,
    })
  })

  it('returns null without touching profiles when there are no claims', async () => {
    const supabase = clientWith(null, { data: null, error: null })
    await expect(getUserFrom(supabase)).resolves.toBeNull()
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('flags profileError and logs when the profile read errors', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const supabase = clientWith({ sub: 'u' }, { data: null, error: { message: 'boom' } })
    await expect(getUserFrom(supabase)).resolves.toEqual({
      claims: { sub: 'u' },
      profile: null,
      profileError: true,
    })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('leaves profileError false when the row is genuinely absent', async () => {
    const supabase = clientWith({ sub: 'u' }, { data: null, error: null })
    await expect(getUserFrom(supabase)).resolves.toEqual({
      claims: { sub: 'u' },
      profile: null,
      profileError: false,
    })
  })
})
