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
})
