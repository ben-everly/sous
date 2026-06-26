import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LoginNotice } from './login-notice'

afterEach(cleanup)

describe('LoginNotice', () => {
  it('renders a real failure assertively (role=alert)', () => {
    render(<LoginNotice error="auth" />)
    const notice = screen.getByRole('alert')
    expect(notice).toHaveTextContent(/something went wrong/i)
  })

  it('renders a benign outcome politely (role=status)', () => {
    render(<LoginNotice error="cancelled" />)
    const notice = screen.getByRole('status')
    expect(notice).toHaveTextContent(/cancelled/i)
  })

  it('renders an expired recovery link assertively (role=alert)', () => {
    render(<LoginNotice error="recovery_invalid" />)
    const notice = screen.getByRole('alert')
    expect(notice).toHaveTextContent(/reset link/i)
  })

  it('renders an expired confirmation link assertively (role=alert)', () => {
    render(<LoginNotice error="confirmation_invalid" />)
    const notice = screen.getByRole('alert')
    expect(notice).toHaveTextContent(/confirmation link/i)
  })
})
