import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CheckInbox } from './check-inbox'

// CheckInbox renders ResendConfirmationButton, which imports the browser client.
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { resend: vi.fn() } }) }))

afterEach(cleanup)

describe('CheckInbox', () => {
  it('names the address and points to spam, with a resend control', () => {
    render(<CheckInbox email="a@b.com" onUseDifferentEmail={() => {}} />)
    expect(screen.getByText('a@b.com')).toBeInTheDocument()
    expect(screen.getByText(/spam/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /resend/i })).toBeInTheDocument()
    expect(screen.getByText(/close this tab/i)).toBeInTheDocument()
  })

  it('invokes onUseDifferentEmail', () => {
    const onUseDifferentEmail = vi.fn()
    render(<CheckInbox email="a@b.com" onUseDifferentEmail={onUseDifferentEmail} />)
    fireEvent.click(screen.getByRole('button', { name: /different email/i }))
    expect(onUseDifferentEmail).toHaveBeenCalled()
  })
})
