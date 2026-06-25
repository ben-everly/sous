import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ResendConfirmationButton } from './resend-confirmation-button'

const resend = vi.fn()
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { resend } }) }))

afterEach(cleanup)
beforeEach(() => {
  resend.mockReset()
  vi.useRealTimers()
})

describe('ResendConfirmationButton', () => {
  it('starts disabled when the cooldown is seeded, then enables after 60s', () => {
    vi.useFakeTimers()
    render(<ResendConfirmationButton email="a@b.com" seedCooldown />)
    const button = screen.getByRole('button', { name: /resend/i })
    expect(button).toBeDisabled()
    expect(screen.getByText(/resend in about a minute/i)).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(60_000))
    expect(button).not.toBeDisabled()
  })

  it('resends and confirms when not cooling down', async () => {
    resend.mockResolvedValue({ error: null })
    render(<ResendConfirmationButton email="a@b.com" seedCooldown={false} />)
    fireEvent.click(screen.getByRole('button', { name: /resend/i }))
    expect(await screen.findByText(/sent/i)).toBeInTheDocument()
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
})
