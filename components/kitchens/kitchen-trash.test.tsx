import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { KitchenTrash } from './kitchen-trash'
import type { Kitchen } from '@/lib/kitchens/types'

afterEach(cleanup)

const trashed: Kitchen = {
  id: 'k1',
  name: 'Beach House',
  created_at: '2026-01-01T00:00:00Z',
  deleted_at: '2026-02-01T00:00:00Z',
}

function renderTrash(overrides: Partial<React.ComponentProps<typeof KitchenTrash>> = {}) {
  const props = {
    deleted: [trashed],
    onLoad: vi.fn(),
    onRestore: vi.fn(),
    onPurge: vi.fn(),
    ...overrides,
  }
  render(<KitchenTrash {...props} />)
  return props
}

describe('KitchenTrash', () => {
  it('shows a count and un-mutes the label when trash is non-empty', () => {
    renderTrash({ deleted: [trashed, { ...trashed, id: 'k2', name: 'Cabin' }] })
    const btn = screen.getByRole('button', { name: 'Trash (2)' })
    expect(btn).toHaveClass('text-foreground')
    expect(btn).not.toHaveClass('text-muted-foreground')
  })

  it('shows a bare, muted label when trash is empty', () => {
    renderTrash({ deleted: [] })
    expect(screen.getByRole('button', { name: 'Trash' })).toHaveClass('text-muted-foreground')
  })

  it('is collapsed by default and lazy-loads on first expand', () => {
    const { onLoad } = renderTrash({ deleted: [] })
    const btn = screen.getByRole('button', { name: 'Trash' })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Beach House')).not.toBeInTheDocument()
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    expect(onLoad).toHaveBeenCalledTimes(1)
  })

  it('lists trashed kitchens when expanded', () => {
    renderTrash()
    fireEvent.click(screen.getByRole('button', { name: 'Trash (1)' }))
    expect(screen.getByText('Beach House')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Restore Beach House' })).toBeInTheDocument()
  })

  it('restores a kitchen via the callback', () => {
    const { onRestore } = renderTrash()
    fireEvent.click(screen.getByRole('button', { name: 'Trash (1)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore Beach House' }))
    expect(onRestore).toHaveBeenCalledWith(trashed)
  })

  it('purges only after confirming the dialog', () => {
    const { onPurge } = renderTrash()
    fireEvent.click(screen.getByRole('button', { name: 'Trash (1)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete Beach House permanently' }))
    expect(onPurge).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }))
    expect(onPurge).toHaveBeenCalledWith(trashed)
  })

  it('refetches on each expand so a reopen sees fresh trash', () => {
    const { onLoad } = renderTrash({ deleted: [trashed] })
    const btn = screen.getByRole('button', { name: 'Trash (1)' })
    fireEvent.click(btn) // open
    fireEvent.click(btn) // close
    fireEvent.click(btn) // open again
    expect(onLoad).toHaveBeenCalledTimes(2)
  })

  it('shows an empty message when the trash is loaded but empty', () => {
    renderTrash({ deleted: [] })
    fireEvent.click(screen.getByRole('button', { name: 'Trash' }))
    expect(screen.getByText('Trash is empty.')).toBeInTheDocument()
  })

  it('links the disclosure to its panel', () => {
    renderTrash({ deleted: [] })
    const btn = screen.getByRole('button', { name: 'Trash' })
    expect(btn).toHaveAttribute('aria-controls', 'kitchen-trash-panel')
    fireEvent.click(btn)
    expect(document.getElementById('kitchen-trash-panel')).toBeInTheDocument()
  })
})
