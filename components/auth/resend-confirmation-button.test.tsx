import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { markResendSent } from '@/lib/auth/resend-cooldown'
import { ResendConfirmationButton } from './resend-confirmation-button'

const resend = vi.fn()
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { resend } }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))

afterEach(() => {
  cleanup()
  localStorage.clear()
})
beforeEach(() => {
  resend.mockReset()
  vi.mocked(toast.success).mockReset()
  vi.useRealTimers()
})

describe('ResendConfirmationButton', () => {
  it('starts disabled with a live countdown for a recently-sent address, then enables after 60s', () => {
    vi.useFakeTimers()
    markResendSent('a@b.com')
    render(<ResendConfirmationButton email="a@b.com" />)
    const button = screen.getByRole('button', { name: /resend/i })
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent(/available in 60s/i)
    act(() => vi.advanceTimersByTime(15_000))
    expect(button).toHaveTextContent(/available in 45s/i)
    act(() => vi.advanceTimersByTime(45_000))
    expect(button).not.toBeDisabled()
    expect(button).toHaveTextContent('Resend confirmation email')
    expect(button).not.toHaveTextContent(/available in/i)
  })

  it('toasts a success confirmation on a successful resend', async () => {
    resend.mockResolvedValue({ error: null })
    render(<ResendConfirmationButton email="a@b.com" />)
    fireEvent.click(screen.getByRole('button', { name: /resend/i }))
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('Confirmation email sent.'))
    // The success path also seeds the cooldown so the button can't immediately re-fire.
    expect(screen.getByRole('button', { name: /resend/i })).toBeDisabled()
    expect(resend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'signup',
        email: 'a@b.com',
        options: expect.objectContaining({
          emailRedirectTo: expect.stringContaining('/auth/confirm'),
        }),
      }),
    )
  })

  it('surfaces a resend error as an alert, with no success toast', async () => {
    resend.mockResolvedValue({ error: { code: 'over_email_send_rate_limit' } })
    render(<ResendConfirmationButton email="a@b.com" />)
    fireEvent.click(screen.getByRole('button', { name: /resend/i }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(toast.success).not.toHaveBeenCalled()
  })
})
