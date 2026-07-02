import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EmailPasswordSignInForm } from './email-password-sign-in-form'

const push = vi.fn()
const refresh = vi.fn()
const replace = vi.fn()
const signInWithPassword = vi.fn()
let searchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh, replace }),
  useSearchParams: () => searchParams,
}))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signInWithPassword } }),
}))

afterEach(cleanup)
beforeEach(() => {
  push.mockReset()
  refresh.mockReset()
  replace.mockReset()
  signInWithPassword.mockReset()
  searchParams = new URLSearchParams()
})

describe('EmailPasswordSignInForm', () => {
  it('shows a validation error for a bad email and never calls Supabase', async () => {
    render(<EmailPasswordSignInForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nope' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
    expect(signInWithPassword).not.toHaveBeenCalled()
  })

  it('surfaces invalid credentials generically', async () => {
    signInWithPassword.mockResolvedValue({ error: { code: 'invalid_credentials' } })
    render(<EmailPasswordSignInForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/incorrect/i)
    expect(push).not.toHaveBeenCalled()
  })

  it('autofocuses the email field on mount', () => {
    render(<EmailPasswordSignInForm />)
    expect(screen.getByLabelText('Email')).toHaveFocus()
  })

  it('returns focus to the email field after a failed sign-in', async () => {
    signInWithPassword.mockResolvedValue({ error: { code: 'invalid_credentials' } })
    render(<EmailPasswordSignInForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } })
    const password = screen.getByLabelText('Password')
    fireEvent.change(password, { target: { value: 'password1' } })
    // Move focus off the autofocused email field, so passing proves setFocus, not the mount autoFocus.
    password.focus()
    expect(password).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/incorrect/i)
    expect(screen.getByLabelText('Email')).toHaveFocus()
  })

  it('navigates to next on success', async () => {
    signInWithPassword.mockResolvedValue({ error: null })
    render(<EmailPasswordSignInForm next="/kitchen" />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/kitchen'))
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'password1' })
  })

  it('submits the trimmed email (handler consumes resolver values, not getValues)', async () => {
    signInWithPassword.mockResolvedValue({ error: null })
    render(<EmailPasswordSignInForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: '  a@b.com  ' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    await vi.waitFor(() =>
      expect(signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'password1' }),
    )
  })

  it('wires aria-invalid and aria-describedby on an invalid field', async () => {
    render(<EmailPasswordSignInForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nope' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    const message = await screen.findByText(/valid email/i)
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input.getAttribute('aria-describedby')).toContain(message.id)
    expect(message).toHaveAttribute('aria-live', 'polite')
  })

  it('keeps Forgot password visible and reveals Resend confirmation only on failure', async () => {
    signInWithPassword.mockResolvedValue({ error: { code: 'invalid_credentials' } })
    render(<EmailPasswordSignInForm />)
    expect(screen.getByRole('link', { name: /forgot password/i })).toHaveAttribute(
      'href',
      '/forgot-password',
    )
    expect(screen.queryByRole('link', { name: /resend confirmation/i })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/incorrect/i)
    expect(screen.getByRole('link', { name: /resend confirmation/i })).toHaveAttribute(
      'href',
      '/resend-confirmation',
    )
  })

  it('clears the server-error banner on a successful resubmit', async () => {
    signInWithPassword
      .mockResolvedValueOnce({ error: { code: 'invalid_credentials' } })
      .mockResolvedValueOnce({ error: null })
    render(<EmailPasswordSignInForm next="/kitchen" />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/incorrect/i)
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/kitchen'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('drops a stale ?error notice on a failed sign-in, preserving next', async () => {
    searchParams = new URLSearchParams('error=confirmation_invalid&next=/kitchen')
    signInWithPassword.mockResolvedValue({ error: { code: 'invalid_credentials' } })
    render(<EmailPasswordSignInForm next="/kitchen" />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    await screen.findByRole('alert')
    expect(replace).toHaveBeenCalledWith('/login?next=%2Fkitchen')
  })

  it('leaves the URL alone on a failed sign-in when there is no notice', async () => {
    signInWithPassword.mockResolvedValue({ error: { code: 'invalid_credentials' } })
    render(<EmailPasswordSignInForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    await screen.findByRole('alert')
    expect(replace).not.toHaveBeenCalled()
  })

  it('leaves the URL alone for an error value the page never renders a notice for', async () => {
    searchParams = new URLSearchParams('error=garbage')
    signInWithPassword.mockResolvedValue({ error: { code: 'invalid_credentials' } })
    render(<EmailPasswordSignInForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    await screen.findByRole('alert')
    expect(replace).not.toHaveBeenCalled()
  })

  it('keeps the notice when the submit fails client validation', async () => {
    searchParams = new URLSearchParams('error=confirmation_invalid')
    render(<EmailPasswordSignInForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'bad' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    await screen.findByText(/valid email/i)
    expect(signInWithPassword).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
  })
})
