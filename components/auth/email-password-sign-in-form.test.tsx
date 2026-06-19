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

  it('navigates to next on success', async () => {
    signInWithPassword.mockResolvedValue({ error: null })
    render(<EmailPasswordSignInForm next="/kitchen" />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/kitchen'))
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'password1' })
  })
})
