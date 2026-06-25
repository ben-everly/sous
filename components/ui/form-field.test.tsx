import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { FormField } from './form-field'

afterEach(cleanup)

describe('FormField', () => {
  it('associates the label with the input', () => {
    render(<FormField name="email" label="Email" type="email" />)
    expect(screen.getByLabelText('Email')).toHaveAttribute('name', 'email')
  })

  it('wires aria-invalid and aria-describedby to the error when present', () => {
    render(<FormField name="email" label="Email" error="Enter a valid email" />)
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'email-error')
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email')
  })

  it('omits the error wiring when there is no error', () => {
    render(<FormField name="email" label="Email" />)
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'false')
    expect(input).not.toHaveAttribute('aria-describedby')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
