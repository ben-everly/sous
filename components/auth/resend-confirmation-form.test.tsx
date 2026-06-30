import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ResendConfirmationForm } from './resend-confirmation-form'

const resend = vi.fn()
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { resend } }) }))

afterEach(() => {
  cleanup()
  localStorage.clear()
})
beforeEach(() => resend.mockReset())

describe('ResendConfirmationForm', () => {
  it('swaps the heading to the check-inbox state after sending', async () => {
    resend.mockResolvedValue({ error: null })
    render(<ResendConfirmationForm />)
    expect(screen.getByRole('heading', { name: 'Resend confirmation' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: /resend confirmation/i }))
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to sign in/i })).toBeInTheDocument()
  })

  it('shows the same non-enumerating confirmation after a valid submit', async () => {
    resend.mockResolvedValue({ error: null })
    render(<ResendConfirmationForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: /resend confirmation/i }))
    expect(await screen.findByText(/if an account/i)).toBeInTheDocument()
    expect(resend).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'signup', email: 'a@b.com' }),
    )
  })

  // Non-enumeration: the result is ignored, so an error response (e.g. rate limit) renders the
  // identical confirmation — a failing send can't be told apart from a successful one.
  it('shows the same confirmation when resend returns an error', async () => {
    resend.mockResolvedValue({ error: { code: 'over_email_send_rate_limit' } })
    render(<ResendConfirmationForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: /resend confirmation/i }))
    expect(await screen.findByText(/if an account/i)).toBeInTheDocument()
  })

  // The cooldown is keyed by email and persisted, so backing out and resubmitting the same
  // address is blocked — it can't fire a send GoTrue would silently throttle.
  it('blocks resubmitting the same address during the cooldown after backing out', async () => {
    resend.mockResolvedValue({ error: null })
    render(<ResendConfirmationForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: /resend confirmation/i }))
    fireEvent.click(await screen.findByRole('button', { name: /use a different email/i }))
    const submit = screen.getByRole('button', { name: /resend available in/i })
    expect(submit).toBeDisabled()
  })

  it('blocks an invalid email without calling resend', async () => {
    render(<ResendConfirmationForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nope' } })
    fireEvent.click(screen.getByRole('button', { name: /resend confirmation/i }))
    // zodResolver validates asynchronously — await the rendered field error before asserting,
    // or this passes even if validation never blocked (resend just hasn't run yet).
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
    expect(resend).not.toHaveBeenCalled()
  })
})
