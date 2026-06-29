import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COOLDOWN_MS, ResendConfirmationButton } from './resend-confirmation-button'

const resend = vi.fn()
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { resend } }) }))

afterEach(cleanup)
beforeEach(() => {
  resend.mockReset()
  vi.useRealTimers()
})

describe('ResendConfirmationButton', () => {
  it('starts disabled with a live countdown when seeded, then enables after 60s', () => {
    vi.useFakeTimers()
    render(<ResendConfirmationButton email="a@b.com" seedCooldown />)
    const button = screen.getByRole('button', { name: /resend/i })
    expect(button).toBeDisabled()
    expect(screen.getByText('60s')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(15_000))
    expect(screen.getByText('45s')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(45_000))
    expect(button).not.toBeDisabled()
    expect(screen.queryByText(/\d+s/)).not.toBeInTheDocument()
  })

  // The seeded cooldown must match GoTrue's max_frequency, or the button re-enables before
  // GoTrue will accept another send. [auth.sms] has its own max_frequency, so scope to
  // [auth.email] rather than matching the first occurrence in the file.
  it('keeps max_frequency in config.toml equal to COOLDOWN_MS', () => {
    const config = readFileSync(resolve(process.cwd(), 'supabase/config.toml'), 'utf8')
    const afterHeader = config.slice(config.indexOf('[auth.email]') + '[auth.email]'.length)
    const nextSection = afterHeader.search(/^\[/m)
    const emailSection = nextSection === -1 ? afterHeader : afterHeader.slice(0, nextSection)
    const match = emailSection.match(/^max_frequency\s*=\s*"(\d+)s"/m)
    expect(match, 'max_frequency not found in [auth.email]').not.toBeNull()
    expect(Number(match![1]) * 1000).toBe(COOLDOWN_MS)
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
