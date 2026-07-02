import { useEffect } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { FormRootError } from './form-root-error'

function Harness({ message }: { message?: string }) {
  const form = useForm()
  useEffect(() => {
    if (message) form.setError('root', { message })
  }, [message, form])
  return (
    <FormProvider {...form}>
      <FormRootError />
    </FormProvider>
  )
}

afterEach(cleanup)

describe('FormRootError', () => {
  it('renders nothing when there is no root error', () => {
    render(<Harness />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('announces the root error and carries a distinct slot handle', async () => {
    render(<Harness message="Something went wrong." />)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Something went wrong.')
    // Distinct from the field-level FormMessage (data-slot="form-message").
    expect(alert).toHaveAttribute('data-slot', 'form-root-error')
  })
})
