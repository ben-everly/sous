import { afterEach, describe, expect, it, vi } from 'vitest'
import { requireAuthedUser, redirectIfAuthed } from './gate'
import { getUserFrom } from './user'
import { getClaimsFrom } from './claims'

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('./user', () => ({ getUserFrom: vi.fn() }))
vi.mock('./claims', () => ({ getClaimsFrom: vi.fn() }))

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>

afterEach(() => vi.clearAllMocks())

describe('requireAuthedUser', () => {
  it('returns the user when one is present', async () => {
    const user = { claims: { sub: 'u' }, profile: null }
    asMock(getUserFrom).mockResolvedValue(user)
    await expect(requireAuthedUser()).resolves.toBe(user)
  })

  it('logs the backstop and redirects to /login when there is no user', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    asMock(getUserFrom).mockResolvedValue(null)
    await expect(requireAuthedUser()).rejects.toThrow('REDIRECT:/login')
    expect(spy).toHaveBeenCalledOnce()
    spy.mockRestore()
  })
})

describe('redirectIfAuthed', () => {
  it('redirects to the sanitized next path when already authed', async () => {
    asMock(getClaimsFrom).mockResolvedValue({ sub: 'u' })
    await expect(redirectIfAuthed('/recipes')).rejects.toThrow('REDIRECT:/recipes')
  })

  it('falls back to / for an off-site next when already authed', async () => {
    asMock(getClaimsFrom).mockResolvedValue({ sub: 'u' })
    await expect(redirectIfAuthed('https://evil.test')).rejects.toThrow('REDIRECT:/')
  })

  it('does nothing when not authed', async () => {
    asMock(getClaimsFrom).mockResolvedValue(null)
    await expect(redirectIfAuthed('/recipes')).resolves.toBeUndefined()
  })
})
