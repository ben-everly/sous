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
    status: 'ready' as const,
    onLoad: vi.fn(),
    onRestore: vi.fn(),
    onPurge: vi.fn(),
    ...overrides,
  }
  render(<KitchenTrash {...props} />)
  return props
}

describe('KitchenTrash', () => {
  it('is collapsed by default and lazy-loads on first expand', () => {
    const { onLoad } = renderTrash({ status: 'idle', deleted: null })
    const btn = screen.getByRole('button', { name: 'Recently deleted' })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Beach House')).not.toBeInTheDocument()
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    expect(onLoad).toHaveBeenCalledTimes(1)
  })

  it('lists trashed kitchens when expanded', () => {
    renderTrash()
    fireEvent.click(screen.getByRole('button', { name: 'Recently deleted' }))
    expect(screen.getByText('Beach House')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Restore Beach House' })).toBeInTheDocument()
  })

  it('restores a kitchen via the callback', () => {
    const { onRestore } = renderTrash()
    fireEvent.click(screen.getByRole('button', { name: 'Recently deleted' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore Beach House' }))
    expect(onRestore).toHaveBeenCalledWith(trashed)
  })

  it('purges only after confirming the dialog', () => {
    const { onPurge } = renderTrash()
    fireEvent.click(screen.getByRole('button', { name: 'Recently deleted' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete Beach House permanently' }))
    expect(onPurge).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }))
    expect(onPurge).toHaveBeenCalledWith(trashed)
  })

  it('does not call onLoad when status is already ready (re-expand)', () => {
    const { onLoad } = renderTrash({ status: 'ready', deleted: [trashed] })
    const btn = screen.getByRole('button', { name: 'Recently deleted' })
    fireEvent.click(btn)
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(onLoad).not.toHaveBeenCalled()
  })

  it('shows an empty message when the trash is loaded but empty', () => {
    renderTrash({ deleted: [] })
    fireEvent.click(screen.getByRole('button', { name: 'Recently deleted' }))
    expect(screen.getByText('Trash is empty.')).toBeInTheDocument()
  })
})
