import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SignOutButton } from './sign-out-button'

const signOut = vi.fn()
const replace = vi.fn()
const refresh = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signOut } }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh }),
}))

describe('SignOutButton', () => {
  beforeEach(() => {
    signOut.mockReset()
    signOut.mockResolvedValue({ error: null })
    replace.mockReset()
    refresh.mockReset()
  })

  afterEach(cleanup)

  it('signs out, then navigates to /login and refreshes the server tree', async () => {
    render(<SignOutButton />)

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }))

    await waitFor(() => expect(signOut).toHaveBeenCalled())
    expect(replace).toHaveBeenCalledWith('/login')
    expect(refresh).toHaveBeenCalled()
  })

  it('does not navigate and re-enables the button when sign-out fails', async () => {
    signOut.mockResolvedValue({ error: { message: 'network' } })
    render(<SignOutButton />)
    const button = screen.getByRole('button', { name: /sign out/i })

    fireEvent.click(button)

    await waitFor(() => expect(signOut).toHaveBeenCalled())
    expect(replace).not.toHaveBeenCalled()
    expect(refresh).not.toHaveBeenCalled()
    expect(button).toBeEnabled()
  })
})
