import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AuthPanel } from './auth-panel'

afterEach(cleanup)

describe('AuthPanel', () => {
  it('shows the flow title and subtitle before a link is sent', () => {
    render(
      <AuthPanel title="Create your account" subtitle="Start managing your kitchen." sent={false}>
        <div>body</div>
      </AuthPanel>,
    )
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
    expect(screen.getByText('Start managing your kitchen.')).toBeInTheDocument()
  })

  it('swaps to the check-inbox heading and drops the subtitle once sent', () => {
    render(
      <AuthPanel title="Create your account" subtitle="Start managing your kitchen." sent>
        <div>body</div>
      </AuthPanel>,
    )
    expect(screen.getByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
    expect(screen.queryByText('Create your account')).not.toBeInTheDocument()
    expect(screen.queryByText('Start managing your kitchen.')).not.toBeInTheDocument()
  })
})
