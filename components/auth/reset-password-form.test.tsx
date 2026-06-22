import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ResetPasswordForm, DEAD_SESSION_CODES } from './reset-password-form'

const push = vi.fn()
const refresh = vi.fn()
const replace = vi.fn()
const verifyOtp = vi.fn()
const updateUser = vi.fn()
let search = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh, replace }),
  useSearchParams: () => search,
}))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { verifyOtp, updateUser } }),
}))

afterEach(cleanup)
beforeEach(() => {
  push.mockReset()
  refresh.mockReset()
  replace.mockReset()
  verifyOtp.mockReset()
  updateUser.mockReset()
  search = new URLSearchParams('token_hash=abc&type=recovery')
})

describe('ResetPasswordForm', () => {
  // The P2 fix: a normal logged-in session with no recovery token in the URL must
  // never reach the form — token presence + verifyOtp is the gate, not session presence.
  it('redirects to forgot-password when there is no recovery token in the URL', async () => {
    search = new URLSearchParams()
    render(<ResetPasswordForm />)
    await vi.waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/forgot-password?error=recovery_invalid'),
    )
    expect(verifyOtp).not.toHaveBeenCalled()
  })

  it('redirects when the recovery token is invalid or expired', async () => {
    verifyOtp.mockResolvedValue({ error: { message: 'expired' } })
    render(<ResetPasswordForm />)
    await vi.waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/forgot-password?error=recovery_invalid'),
    )
  })

  it('verifies the token and shows the form on success', async () => {
    verifyOtp.mockResolvedValue({ error: null })
    render(<ResetPasswordForm />)
    expect(await screen.findByLabelText('New password', { exact: true })).toBeInTheDocument()
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc', type: 'recovery' })
    // The spent token is stripped from the URL once consumed.
    expect(replace).toHaveBeenCalledWith('/reset-password')
  })

  it('updates the password and goes home on success', async () => {
    verifyOtp.mockResolvedValue({ error: null })
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

  // Drive every dead-session code off the exported set so a vendor rename (or dropping a
  // code) fails loudly instead of silently skipping the recovery_invalid bounce.
  it.each([...DEAD_SESSION_CODES])(
    'bounces to forgot-password when the session is dead at submit time (%s)',
    async (code) => {
      verifyOtp.mockResolvedValue({ error: null })
      updateUser.mockResolvedValue({
        error: { __isAuthError: true, name: 'AuthApiError', code, status: 400 },
      })
      render(<ResetPasswordForm />)
      const password = await screen.findByLabelText('New password', { exact: true })
      fireEvent.change(password, { target: { value: 'password1' } })
      fireEvent.change(screen.getByLabelText('Confirm password'), {
        target: { value: 'password1' },
      })
      fireEvent.click(screen.getByRole('button', { name: /update password/i }))
      await vi.waitFor(() =>
        expect(replace).toHaveBeenCalledWith('/forgot-password?error=recovery_invalid'),
      )
      expect(push).not.toHaveBeenCalled()
    },
  )

  it('shows an inline error for a non-session failure', async () => {
    verifyOtp.mockResolvedValue({ error: null })
    updateUser.mockResolvedValue({
      error: { __isAuthError: true, name: 'AuthApiError', code: 'weak_password', status: 422 },
    })
    render(<ResetPasswordForm />)
    const password = await screen.findByLabelText('New password', { exact: true })
    fireEvent.change(password, { target: { value: 'password1' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'password1' } })
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/8 characters/i)
    // A non-session failure shows inline; it must not bounce to recovery_invalid.
    expect(replace).not.toHaveBeenCalledWith('/forgot-password?error=recovery_invalid')
  })
})
