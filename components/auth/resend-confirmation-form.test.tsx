import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ResendConfirmationForm } from './resend-confirmation-form'

const resend = vi.fn()
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { resend } }) }))

afterEach(cleanup)
beforeEach(() => resend.mockReset())

describe('ResendConfirmationForm', () => {
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

  it('blocks an invalid email without calling resend', () => {
    render(<ResendConfirmationForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nope' } })
    fireEvent.click(screen.getByRole('button', { name: /resend confirmation/i }))
    expect(resend).not.toHaveBeenCalled()
  })
})
