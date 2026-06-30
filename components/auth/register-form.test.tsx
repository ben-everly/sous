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

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})
beforeEach(() => {
  push.mockReset()
  refresh.mockReset()
  signUp.mockReset()
})

const fillForm = (email = 'a@b.com', password = 'password1', confirm = password) => {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password', { exact: true }), {
    target: { value: password },
  })
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: confirm } })
}
const submit = () => fireEvent.click(screen.getByRole('button', { name: /create account/i }))

const awaitingConfirmation = {
  data: { user: { identities: [{ id: '1' }] }, session: null },
  error: null,
}

describe('RegisterForm', () => {
  it('blocks submit when passwords do not match', async () => {
    render(<RegisterForm loginHref="/login" />)
    fillForm('a@b.com', 'password1', 'password2')
    submit()
    expect(await screen.findByText(/do not match/i)).toBeInTheDocument()
    expect(signUp).not.toHaveBeenCalled()
  })

  it('navigates home when a session is returned', async () => {
    signUp.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null })
    render(<RegisterForm loginHref="/login" />)
    fillForm()
    submit()
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/'))
    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@b.com', password: 'password1' }),
    )
    expect(refresh).toHaveBeenCalled()
  })

  it('shows a neutral message for an existing email (no identities)', async () => {
    signUp.mockResolvedValue({ data: { user: { identities: [] }, session: null }, error: null })
    render(<RegisterForm loginHref="/login" />)
    fillForm()
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent(/sign in|reset/i)
    expect(push).not.toHaveBeenCalled()
  })

  it('describes the password rule and leaves description-free fields without a dangling aria-describedby', () => {
    render(<RegisterForm loginHref="/login" />)
    expect(screen.getByLabelText('Password', { exact: true })).toHaveAccessibleDescription(
      'Must be at least 8 characters.',
    )
    // Email has no description and no error, so it must not reference a non-existent element.
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-describedby')
  })

  it('keeps the password hint for screen readers but hides it visually once the rule is violated', async () => {
    render(<RegisterForm loginHref="/login" />)
    fillForm('a@b.com', 'short')
    submit()
    expect(await screen.findByText('Password must be at least 8 characters.')).toBeInTheDocument()
    // The hint is visually hidden but stays in the accessible description alongside the error.
    expect(screen.getByText('Must be at least 8 characters.')).toHaveClass('sr-only')
    expect(screen.getByLabelText('Password', { exact: true })).toHaveAccessibleDescription(
      /Must be at least 8 characters\./,
    )
  })

  it('shows the form chrome before a confirmation is sent', () => {
    render(<RegisterForm loginHref="/login" />)
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /forgot password/i })).toBeInTheDocument()
  })

  // Confirmations-on: a genuine new signup is sessionless but has identities — it must show
  // the check-inbox view, not navigate home (which the auth gate would bounce). The heading
  // follows; the signup form footer drops (you just created the account) and the sent view
  // offers its own "Back to sign in".
  it('swaps to the check-inbox view and sheds the form footer after sending', async () => {
    signUp.mockResolvedValue(awaitingConfirmation)
    render(<RegisterForm loginHref="/login" />)
    fillForm()
    submit()

    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
    expect(screen.getByText('a@b.com')).toBeInTheDocument()
    expect(screen.getByText(/spam/i)).toBeInTheDocument()
    // Signup seeds the cooldown, so the resend button arrives already disabled (no premature
    // re-send within GoTrue's window).
    expect(screen.getByRole('button', { name: /resend/i })).toBeDisabled()
    expect(screen.getByRole('link', { name: /back to sign in/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /forgot password/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/already have an account/i)).not.toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('returns to a cleared form when choosing a different email', async () => {
    signUp.mockResolvedValue(awaitingConfirmation)
    render(<RegisterForm loginHref="/login" />)
    fillForm()
    submit()

    fireEvent.click(await screen.findByRole('button', { name: /different email/i }))
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument()
    // Backing out resets the form rather than pre-filling the just-sent address.
    expect(screen.getByLabelText('Email')).toHaveValue('')
    expect(screen.getByLabelText('Password', { exact: true })).toHaveValue('')
  })
})
