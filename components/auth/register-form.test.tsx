import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RegisterForm } from './register-form'

const push = vi.fn()
const refresh = vi.fn()
const signUp = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh, replace: vi.fn() }) }))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signUp, resend: vi.fn() } }),
}))

afterEach(cleanup)
beforeEach(() => {
  push.mockReset()
  refresh.mockReset()
  signUp.mockReset()
})

describe('RegisterForm', () => {
  it('blocks submit when passwords do not match', async () => {
    render(<RegisterForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('Password', { exact: true }), {
      target: { value: 'password1' },
    })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'password2' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByText(/do not match/i)).toBeInTheDocument()
    expect(signUp).not.toHaveBeenCalled()
  })

  it('navigates home when a session is returned', async () => {
    signUp.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null })
    render(<RegisterForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('Password', { exact: true }), {
      target: { value: 'password1' },
    })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'password1' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/'))
    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@b.com', password: 'password1' }),
    )
    expect(refresh).toHaveBeenCalled()
  })

  it('shows a neutral message for an existing email (no identities)', async () => {
    signUp.mockResolvedValue({ data: { user: { identities: [] }, session: null }, error: null })
    render(<RegisterForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('Password', { exact: true }), {
      target: { value: 'password1' },
    })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'password1' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/sign in|reset/i)
    expect(push).not.toHaveBeenCalled()
  })

  // Confirmations-on: a genuine new signup is sessionless but has identities — it must
  // render the check-inbox screen, not navigate home (which the auth gate would bounce).
  it('shows the check-inbox screen for a brand-new signup awaiting confirmation', async () => {
    signUp.mockResolvedValue({
      data: { user: { identities: [{ id: '1' }] }, session: null },
      error: null,
    })
    render(<RegisterForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('Password', { exact: true }), {
      target: { value: 'password1' },
    })
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'password1' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByText('a@b.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /resend/i })).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })
})
