import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RegisterForm } from './register-form'

const push = vi.fn()
const refresh = vi.fn()
const signUp = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh, replace: vi.fn() }) }))
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { signUp } }) }))

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
    expect(signUp).toHaveBeenCalledWith({ email: 'a@b.com', password: 'password1' })
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

  // Confirmations-on shape: a genuine new signup is sessionless but has a populated identities
  // array. Keying off the null session alone (instead of identities) would mislabel it as a
  // duplicate — the regression this guards against once SIDE-135 enables confirmations.
  it('does not warn a brand-new signup that is awaiting confirmation', async () => {
    signUp.mockResolvedValue({
      data: { user: { identities: [{ id: '1' }] }, session: null },
      error: null,
    })
    render(<RegisterForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('Password', { exact: true }), {
      target: { value: 'password1' },
    })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'password1' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    await vi.waitFor(() => expect(push).toHaveBeenCalled())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
