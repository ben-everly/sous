import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Spinner } from './spinner'

afterEach(cleanup)

describe('Spinner', () => {
  it('exposes a status role for assistive tech', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows the label when provided', () => {
    render(<Spinner label="Verifying your reset link…" />)
    expect(screen.getByRole('status')).toHaveTextContent('Verifying your reset link…')
  })
})
