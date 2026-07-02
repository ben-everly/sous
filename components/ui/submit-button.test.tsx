import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { SubmitButton } from './submit-button'

afterEach(cleanup)

describe('SubmitButton', () => {
  it('renders an enabled submit button when idle', () => {
    render(<SubmitButton pending={false}>Sign in</SubmitButton>)
    const button = screen.getByRole('button', { name: 'Sign in' })
    expect(button).toHaveAttribute('type', 'submit')
    expect(button).toBeEnabled()
    expect(button).toHaveAttribute('aria-busy', 'false')
  })

  it('disables and marks busy while pending', () => {
    render(<SubmitButton pending>Sign in</SubmitButton>)
    const button = screen.getByRole('button', { name: 'Sign in' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })
})
