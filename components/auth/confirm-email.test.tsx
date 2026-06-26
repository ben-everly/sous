import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfirmEmail } from './confirm-email'

const replace = vi.fn()
const verifyOtp = vi.fn()
const locationReplace = vi.fn()
let search = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => search,
}))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { verifyOtp } }),
}))

afterEach(cleanup)
beforeEach(() => {
  replace.mockReset()
  verifyOtp.mockReset()
  locationReplace.mockReset()
  // jsdom doesn't implement navigation; stand in so the success path can hard-redirect.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { replace: locationReplace },
  })
  search = new URLSearchParams('token_hash=abc&type=signup')
})

describe('ConfirmEmail', () => {
  it('redirects to confirmation_invalid when there is no token in the URL', async () => {
    search = new URLSearchParams()
    render(<ConfirmEmail />)
    await vi.waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/login?error=confirmation_invalid'),
    )
    expect(verifyOtp).not.toHaveBeenCalled()
  })

  it('verifies the signup token and redirects home on success', async () => {
    verifyOtp.mockResolvedValue({ error: null })
    render(<ConfirmEmail />)
    await vi.waitFor(() => expect(locationReplace).toHaveBeenCalledWith('/'))
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc', type: 'signup' })
  })

  // The verify type is the signup CONSTANT, never the URL's `type`, so a recovery token
  // redeemed here is rejected by GoTrue — keeping recovery on its own gated path.
  it('verifies as signup even when the URL says recovery', async () => {
    verifyOtp.mockResolvedValue({ error: null })
    search = new URLSearchParams('token_hash=abc&type=recovery')
    render(<ConfirmEmail />)
    await vi.waitFor(() =>
      expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc', type: 'signup' }),
    )
  })

  it('redirects to confirmation_invalid on a failed verify', async () => {
    verifyOtp.mockResolvedValue({ error: { message: 'expired' } })
    render(<ConfirmEmail />)
    await vi.waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/login?error=confirmation_invalid'),
    )
    expect(locationReplace).not.toHaveBeenCalled()
  })

  it('shows a spinner while verifying', () => {
    verifyOtp.mockReturnValue(new Promise(() => {}))
    render(<ConfirmEmail />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
