import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ResetPasswordForm } from './reset-password-form'

const push = vi.fn()
const refresh = vi.fn()
const replace = vi.fn()
const getSession = vi.fn()
const updateUser = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh, replace }) }))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { getSession, updateUser } }),
}))

afterEach(cleanup)
beforeEach(() => {
  push.mockReset()
  refresh.mockReset()
  replace.mockReset()
  getSession.mockReset()
  updateUser.mockReset()
})

describe('ResetPasswordForm', () => {
  it('redirects to forgot-password when there is no recovery session', async () => {
    getSession.mockResolvedValue({ data: { session: null } })
    render(<ResetPasswordForm />)
    await vi.waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/forgot-password?error=recovery_invalid'),
    )
  })

  it('updates the password and goes home on success', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 't' } } })
    updateUser.mockResolvedValue({ error: null })
    render(<ResetPasswordForm />)
    const password = await screen.findByLabelText('New password', { exact: true })
    fireEvent.change(password, { target: { value: 'password1' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'password1' } })
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))
    await vi.waitFor(() => expect(updateUser).toHaveBeenCalledWith({ password: 'password1' }))
    expect(push).toHaveBeenCalledWith('/')
    expect(refresh).toHaveBeenCalled()
  })
})
