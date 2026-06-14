import { type ComponentProps } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { KitchenRow } from './kitchen-row'

afterEach(cleanup)

type Props = ComponentProps<typeof KitchenRow>
const kitchen = { id: 'k1', name: 'Beach House', created_at: '2026-01-01T00:00:00Z' }

function renderRow(overrides: Partial<Props> = {}) {
  const props: Props = {
    kitchen,
    ownerDisplayName: 'Ada',
    isEditing: false,
    onEdit: vi.fn(),
    onCancelEdit: vi.fn(),
    onRename: vi.fn().mockResolvedValue(true),
    onRequestDelete: vi.fn(),
    ...overrides,
  }
  render(
    <ul>
      <KitchenRow {...props} />
    </ul>,
  )
  return props
}

describe('KitchenRow', () => {
  it('shows the name with rename/delete controls', () => {
    renderRow()
    expect(screen.getByText('Beach House')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rename Beach House' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete Beach House' })).toBeInTheDocument()
  })

  it('falls back to the owner label for a nameless kitchen', () => {
    renderRow({ kitchen: { ...kitchen, name: null } })
    expect(screen.getByText("Ada's Kitchen")).toBeInTheDocument()
  })

  it('requests edit and delete via callbacks', () => {
    const { onEdit, onRequestDelete } = renderRow()
    fireEvent.click(screen.getByRole('button', { name: 'Rename Beach House' }))
    expect(onEdit).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Delete Beach House' }))
    expect(onRequestDelete).toHaveBeenCalled()
  })

  it('renders the edit form seeded with the current name when editing', () => {
    renderRow({ isEditing: true })
    expect(screen.getByLabelText('Kitchen name')).toHaveValue('Beach House')
  })

  it('submits a rename through the edit form', async () => {
    const { onRename } = renderRow({ isEditing: true })
    fireEvent.change(screen.getByLabelText('Kitchen name'), { target: { value: 'Lake House' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onRename).toHaveBeenCalledWith('Lake House'))
  })
})
