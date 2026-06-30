import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ForgotPasswordForm } from './forgot-password-form'

const resetPasswordForEmail = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { resetPasswordForEmail } }),
}))

afterEach(() => {
  cleanup()
  localStorage.clear()
})
beforeEach(() => resetPasswordForEmail.mockReset())

describe('ForgotPasswordForm', () => {
  it('shows a neutral confirmation on success (non-enumerating)', async () => {
    resetPasswordForEmail.mockResolvedValue({ error: null })
    render(<ForgotPasswordForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }))
    expect(await screen.findByRole('status')).toHaveTextContent(/if an account exists/i)
    expect(resetPasswordForEmail).toHaveBeenCalledWith(
      'a@b.com',
      expect.objectContaining({
        redirectTo: expect.stringContaining('/reset-password'),
      }),
    )
    const call = resetPasswordForEmail.mock.calls[0]
    expect(call[1].redirectTo).not.toContain('/auth/callback')
    // Disabled because the send just seeded the cooldown.
    expect(screen.getByRole('button', { name: /resend/i })).toBeDisabled()
  })

  it('shows the entered email and offers a way back to the form', async () => {
    resetPasswordForEmail.mockResolvedValue({ error: null })
    render(<ForgotPasswordForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'typo@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }))
    expect(await screen.findByRole('status')).toHaveTextContent(/typo@b\.com/)
    fireEvent.click(screen.getByRole('button', { name: /different email/i }))
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('surfaces a rate-limit error', async () => {
    resetPasswordForEmail.mockResolvedValue({ error: { code: 'over_email_send_rate_limit' } })
    render(<ForgotPasswordForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/try again/i)
  })
})
