import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GoogleSignInButton } from './google-sign-in-button'

const signInWithOAuth = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signInWithOAuth } }),
}))

const clickSignIn = () =>
  fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }))

describe('GoogleSignInButton', () => {
  beforeEach(() => {
    signInWithOAuth.mockReset()
  })

  afterEach(cleanup)

  it('shows an error and re-enables the button when signInWithOAuth returns an error', async () => {
    signInWithOAuth.mockResolvedValue({ data: null, error: { message: 'boom' } })
    render(<GoogleSignInButton />)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    clickSignIn()

    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong starting sign-in/i)
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeEnabled()
  })

  it('shows an error and re-enables the button when signInWithOAuth throws', async () => {
    signInWithOAuth.mockRejectedValue(new Error('network'))
    render(<GoogleSignInButton />)

    clickSignIn()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeEnabled()
  })

  it('stays disabled (spinner persists) on the success path while the page redirects', async () => {
    signInWithOAuth.mockResolvedValue({ data: { url: 'https://accounts.google.com' }, error: null })
    render(<GoogleSignInButton />)
    const button = screen.getByRole('button', { name: /sign in with google/i })

    clickSignIn()

    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalled())
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('re-enables the button when a bfcache restore brings the page back', async () => {
    signInWithOAuth.mockResolvedValue({ data: { url: 'https://accounts.google.com' }, error: null })
    render(<GoogleSignInButton />)
    const button = screen.getByRole('button', { name: /sign in with google/i })

    clickSignIn()
    await waitFor(() => expect(button).toBeDisabled())

    const pageshow = new Event('pageshow')
    Object.defineProperty(pageshow, 'persisted', { value: true })
    fireEvent(window, pageshow)

    expect(button).toBeEnabled()
    expect(button).toHaveAttribute('aria-busy', 'false')
  })

  it('threads next into the OAuth redirectTo', async () => {
    signInWithOAuth.mockResolvedValue({ data: { url: 'https://accounts.google.com' }, error: null })
    render(<GoogleSignInButton next="/recipes/1?sort=new" />)

    clickSignIn()

    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalled())
    const redirectTo = signInWithOAuth.mock.calls[0][0].options.redirectTo as string
    expect(new URL(redirectTo).searchParams.get('next')).toBe('/recipes/1?sort=new')
  })

  it('omits next from redirectTo when not provided', async () => {
    signInWithOAuth.mockResolvedValue({ data: { url: 'https://accounts.google.com' }, error: null })
    render(<GoogleSignInButton />)

    clickSignIn()

    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalled())
    const redirectTo = signInWithOAuth.mock.calls[0][0].options.redirectTo as string
    expect(new URL(redirectTo).pathname).toBe('/auth/callback')
    expect(new URL(redirectTo).searchParams.has('next')).toBe(false)
  })
})
