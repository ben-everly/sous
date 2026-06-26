import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { ensureEmailIdentity } from './auth'

const fakeAdmin = (updateUserById = vi.fn().mockResolvedValue({ error: null })) =>
  ({ auth: { admin: { updateUserById } } }) as unknown as SupabaseClient

const user = (overrides: Partial<User>): User =>
  ({ id: 'u1', email: 'a@b.com', identities: [], ...overrides }) as User

describe('ensureEmailIdentity', () => {
  it('backfills the email identity when the user has only an OAuth identity', async () => {
    const updateUserById = vi.fn().mockResolvedValue({ error: null })
    const result = await ensureEmailIdentity(
      user({ identities: [{ provider: 'google' } as NonNullable<User['identities']>[number]] }),
      fakeAdmin(updateUserById),
    )

    expect(updateUserById).toHaveBeenCalledWith('u1', { email: 'a@b.com', email_confirm: true })
    expect(result).toBe(true)
  })

  it('does nothing when an email identity already exists', async () => {
    const updateUserById = vi.fn()
    const result = await ensureEmailIdentity(
      user({ identities: [{ provider: 'email' } as NonNullable<User['identities']>[number]] }),
      fakeAdmin(updateUserById),
    )

    expect(updateUserById).not.toHaveBeenCalled()
    expect(result).toBe(false)
  })

  it('propagates an admin error so the caller can log it', async () => {
    const updateUserById = vi.fn().mockResolvedValue({ error: new Error('boom') })
    await expect(
      ensureEmailIdentity(user({ identities: [] }), fakeAdmin(updateUserById)),
    ).rejects.toThrow('boom')
  })
})
