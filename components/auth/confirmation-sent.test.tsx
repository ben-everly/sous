import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConfirmationSent } from './confirmation-sent'

// Renders ResendConfirmationButton, which imports the browser client.
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { resend: vi.fn() } }) }))

afterEach(cleanup)

describe('ConfirmationSent', () => {
  it('renders the caller message plus the shared resend / recovery controls', () => {
    render(
      <ConfirmationSent email="a@b.com" loginHref="/login" onUseDifferentEmail={() => {}}>
        We sent a link to <span>a@b.com</span>.
      </ConfirmationSent>,
    )
    expect(screen.getByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
    expect(screen.getByText(/we sent a link to/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /resend/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /use a different email/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to sign in/i })).toHaveAttribute('href', '/login')
  })

  it('invokes onUseDifferentEmail when backing out', () => {
    const onUseDifferentEmail = vi.fn()
    render(
      <ConfirmationSent
        email="a@b.com"
        loginHref="/login"
        onUseDifferentEmail={onUseDifferentEmail}
      >
        message
      </ConfirmationSent>,
    )
    fireEvent.click(screen.getByRole('button', { name: /use a different email/i }))
    expect(onUseDifferentEmail).toHaveBeenCalled()
  })
})
