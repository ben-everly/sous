import { type ComponentProps } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { KitchenNameForm } from './kitchen-name-form'

afterEach(cleanup)

type Props = ComponentProps<typeof KitchenNameForm>

function renderForm(overrides: Partial<Props> = {}) {
  const props: Props = {
    initialValue: '',
    inputLabel: 'Kitchen name',
    submitLabel: 'Save',
    onSubmit: vi.fn().mockResolvedValue(true),
    onCancel: vi.fn(),
    ...overrides,
  }
  render(<KitchenNameForm {...props} />)
  return props
}

describe('KitchenNameForm', () => {
  it('seeds the input with initialValue', () => {
    renderForm({ initialValue: 'Beach House' })
    expect(screen.getByLabelText('Kitchen name')).toHaveValue('Beach House')
  })

  it('disables submit until the trimmed value is non-empty', () => {
    renderForm()
    const save = screen.getByRole('button', { name: 'Save' })
    expect(save).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Kitchen name'), { target: { value: '   ' } })
    expect(save).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Kitchen name'), { target: { value: 'Lake' } })
    expect(save).toBeEnabled()
  })

  it('submits the trimmed value', async () => {
    const { onSubmit } = renderForm({ initialValue: '  Lake House  ' })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('Lake House'))
  })

  it('cancels on Escape and via the Cancel button', () => {
    const { onCancel } = renderForm({ initialValue: 'x' })
    fireEvent.keyDown(screen.getByLabelText('Kitchen name'), { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(2)
  })

  it('re-enables and keeps the typed value when the submit is rejected', async () => {
    const { onSubmit } = renderForm({
      initialValue: 'Lake',
      onSubmit: vi.fn().mockResolvedValue(false),
    })
    const save = screen.getByRole('button', { name: 'Save' })
    fireEvent.click(save)
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(save).toBeEnabled()
    expect(screen.getByLabelText('Kitchen name')).toHaveValue('Lake')
  })

  it('marks the button busy and guards re-entry while a submit is in flight', async () => {
    let resolve: (v: boolean) => void = () => {}
    const onSubmit = vi.fn().mockReturnValue(new Promise<boolean>((r) => (resolve = r)))
    renderForm({ initialValue: 'Lake', onSubmit })
    const save = screen.getByRole('button', { name: 'Save' })

    fireEvent.click(save)
    await waitFor(() => expect(save).toBeDisabled())
    expect(save).toHaveAttribute('aria-busy', 'true')

    fireEvent.click(save) // ignored while pending
    expect(onSubmit).toHaveBeenCalledTimes(1)

    resolve(false)
    await waitFor(() => expect(save).toBeEnabled())
  })
})
