import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EmailPasswordSignInForm } from './email-password-sign-in-form'

const push = vi.fn()
const refresh = vi.fn()
const signInWithPassword = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh, replace: vi.fn() }) }))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signInWithPassword } }),
}))

afterEach(cleanup)
beforeEach(() => {
  push.mockReset()
  refresh.mockReset()
  signInWithPassword.mockReset()
})

describe('EmailPasswordSignInForm', () => {
  it('shows a validation error for a bad email and never calls Supabase', async () => {
    render(<EmailPasswordSignInForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nope' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/valid email/i)
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
    const message = await screen.findByRole('alert')
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input.getAttribute('aria-describedby')).toContain(message.id)
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
})
