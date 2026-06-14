import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Row = { id: string; name: string | null; created_at: string }

// Mutable per-test results + spies, shared into the hoisted module mocks.
const mocks = vi.hoisted(() => ({
  results: {
    select: { data: [] as Row[], error: null as null | { message: string } },
    insert: { data: null as Row | null, error: null as null | { message: string } },
    update: { error: null as null | { message: string } },
    delete: { error: null as null | { message: string } },
  },
  insertSpy: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('sonner', () => ({ toast: { error: mocks.toastError } }))

// A chainable stub: each builder method returns the same object; the terminal
// `then` resolves to whichever result matches the operation that was invoked.
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => {
      let op: 'select' | 'insert' | 'update' | 'delete' = 'select'
      const chain = {
        select: () => chain,
        insert: (obj: { name: string | null }) => {
          op = 'insert'
          mocks.insertSpy(obj)
          return chain
        },
        update: () => {
          op = 'update'
          return chain
        },
        delete: () => {
          op = 'delete'
          return chain
        },
        order: () => chain,
        eq: () => chain,
        single: () => chain,
        then: (resolve: (v: unknown) => void) => resolve(mocks.results[op]),
      }
      return chain
    },
  }),
}))

import { KitchensManager } from './kitchens-manager'

const renderManager = () => render(<KitchensManager ownerDisplayName="Ada" />)

beforeEach(() => {
  mocks.results.select = { data: [], error: null }
  mocks.results.insert = { data: null, error: null }
  mocks.results.update = { error: null }
  mocks.results.delete = { error: null }
  mocks.insertSpy.mockReset()
  mocks.toastError.mockReset()
})

afterEach(cleanup)

describe('KitchensManager', () => {
  it('renders the owner kitchens after load', async () => {
    mocks.results.select = {
      data: [{ id: 'k1', name: 'Beach House', created_at: '2026-01-01' }],
      error: null,
    }
    renderManager()
    expect(await screen.findByText('Beach House')).toBeInTheDocument()
  })

  it('shows a retry view on load failure, then the list when retried', async () => {
    mocks.results.select = { data: [], error: { message: 'network' } }
    renderManager()

    expect(await screen.findByText('Could not load your kitchens.')).toBeInTheDocument()
    expect(screen.queryByText(/you have no kitchens yet/i)).not.toBeInTheDocument()

    mocks.results.select = {
      data: [{ id: 'k1', name: 'Beach House', created_at: '2026-01-01' }],
      error: null,
    }
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Beach House')).toBeInTheDocument()
  })

  it('shows the empty state when there are no kitchens', async () => {
    renderManager()
    expect(await screen.findByText(/you have no kitchens yet/i)).toBeInTheDocument()
  })

  it('creates a named kitchen through the draft row and appends it', async () => {
    mocks.results.select = {
      data: [{ id: 'k1', name: 'Beach House', created_at: '2026-01-01' }],
      error: null,
    }
    mocks.results.insert = {
      data: { id: 'k2', name: 'Lake House', created_at: '2026-01-02' },
      error: null,
    }
    renderManager()
    await screen.findByText('Beach House')

    fireEvent.click(screen.getByRole('button', { name: 'Add kitchen' }))
    fireEvent.change(screen.getByLabelText('New kitchen name'), { target: { value: 'Lake House' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(await screen.findByText('Lake House')).toBeInTheDocument()
    expect(mocks.insertSpy).toHaveBeenCalledWith({ name: 'Lake House' })
  })

  it('rolls back an optimistic delete when the request fails', async () => {
    mocks.results.select = {
      data: [{ id: 'k1', name: 'Beach House', created_at: '2026-01-01' }],
      error: null,
    }
    mocks.results.delete = { error: { message: 'network' } }
    renderManager()
    await screen.findByText('Beach House')

    fireEvent.click(screen.getByRole('button', { name: 'Delete Beach House' }))
    fireEvent.click(await screen.findByRole('button', { name: /^Delete$/ }))

    // Optimistically removed, then restored on failure — the row survives and we toast.
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalled())
    expect(screen.getByText('Beach House')).toBeInTheDocument()
  })
})
