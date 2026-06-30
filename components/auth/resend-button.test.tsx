import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { markResendSent } from '@/lib/auth/resend-cooldown'
import { ResendButton } from './resend-button'

vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))

afterEach(() => {
  cleanup()
  localStorage.clear()
})
beforeEach(() => {
  vi.mocked(toast.success).mockReset()
  vi.useRealTimers()
})

const props = {
  email: 'a@b.com',
  label: 'Resend confirmation email',
  successMessage: 'Confirmation email sent.',
}

describe('ResendButton', () => {
  it('starts disabled with a live countdown for a recently-sent address, then enables after 60s', () => {
    vi.useFakeTimers()
    markResendSent('a@b.com')
    render(<ResendButton {...props} resend={vi.fn()} />)
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

  it('runs the resend, toasts the success message, then seeds the cooldown', async () => {
    const resend = vi.fn().mockResolvedValue({ error: null })
    render(<ResendButton {...props} resend={resend} />)
    fireEvent.click(screen.getByRole('button', { name: /resend/i }))
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('Confirmation email sent.'))
    expect(resend).toHaveBeenCalledOnce()
    // The success path also seeds the cooldown so the button can't immediately re-fire.
    expect(screen.getByRole('button', { name: /resend/i })).toBeDisabled()
  })

  it('surfaces a resend error as an alert, with no success toast', async () => {
    const resend = vi.fn().mockResolvedValue({ error: { code: 'over_email_send_rate_limit' } })
    render(<ResendButton {...props} resend={resend} />)
    fireEvent.click(screen.getByRole('button', { name: /resend/i }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(toast.success).not.toHaveBeenCalled()
  })
})
