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

  it('shows an error when signInWithOAuth returns an error', async () => {
    signInWithOAuth.mockResolvedValue({ data: null, error: { message: 'boom' } })
    render(<GoogleSignInButton />)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    clickSignIn()

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't reach google/i)
  })

  it('shows an error when signInWithOAuth throws', async () => {
    signInWithOAuth.mockRejectedValue(new Error('network'))
    render(<GoogleSignInButton />)

    clickSignIn()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('shows no error on the success (redirecting) path', async () => {
    signInWithOAuth.mockResolvedValue({ data: { url: 'https://accounts.google.com' }, error: null })
    render(<GoogleSignInButton />)

    clickSignIn()

    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalled())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
