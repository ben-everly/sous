import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Row = { id: string; name: string | null; created_at: string; deleted_at: string | null }

const mocks = vi.hoisted(() => ({
  results: {
    select: { data: [] as Row[], error: null as null | { message: string } },
    insert: { data: null as Row | null, error: null as null | { message: string; code?: string } },
    update: { data: null as { id: string } | null, error: null as null | { message: string } },
    delete: { data: null as { id: string } | null, error: null as null | { message: string } },
    rpc: { data: null as Row | null, error: null as null | { message: string } },
  },
  insertSpy: vi.fn(),
  rpcSpy: vi.fn(),
  toast: Object.assign(vi.fn(), { error: vi.fn() }),
}))

vi.mock('sonner', () => ({ toast: mocks.toast }))

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
        is: () => chain,
        not: () => chain,
        order: () => chain,
        eq: () => chain,
        single: () => chain,
        maybeSingle: () => chain,
        then: (resolve: (v: unknown) => void) => resolve(mocks.results[op]),
      }
      return chain
    },
    rpc: (name: string, args: unknown) => {
      mocks.rpcSpy(name, args)
      return { then: (resolve: (v: unknown) => void) => resolve(mocks.results.rpc) }
    },
  }),
}))

import { KitchensManager } from './kitchens-manager'

const renderManager = () => render(<KitchensManager />)

beforeEach(() => {
  mocks.results.select = { data: [], error: null }
  mocks.results.insert = { data: null, error: null }
  mocks.results.update = { data: null, error: null }
  mocks.results.delete = { data: null, error: null }
  mocks.results.rpc = { data: null, error: null }
  mocks.insertSpy.mockReset()
  mocks.rpcSpy.mockReset()
  mocks.toast.mockReset()
  mocks.toast.error.mockReset()
})

afterEach(cleanup)

const beach: Row = { id: 'k1', name: 'Beach House', created_at: '2026-01-01', deleted_at: null }

describe('KitchensManager', () => {
  it('renders the owner kitchens after load', async () => {
    mocks.results.select = { data: [beach], error: null }
    renderManager()
    expect(await screen.findByText('Beach House')).toBeInTheDocument()
  })

  it('shows a retry view on load failure, then the list when retried', async () => {
    mocks.results.select = { data: [], error: { message: 'network' } }
    renderManager()

    expect(await screen.findByText('Could not load your kitchens.')).toBeInTheDocument()
    expect(screen.queryByText(/you have no kitchens yet/i)).not.toBeInTheDocument()

    mocks.results.select = { data: [beach], error: null }
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Beach House')).toBeInTheDocument()
  })

  it('shows the empty state when there are no kitchens', async () => {
    renderManager()
    expect(await screen.findByText(/you have no kitchens yet/i)).toBeInTheDocument()
  })

  it('creates a named kitchen through the draft row and appends it', async () => {
    mocks.results.select = { data: [beach], error: null }
    mocks.results.insert = {
      data: { id: 'k2', name: 'Lake House', created_at: '2026-01-02', deleted_at: null },
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

  it('requires a name before a draft kitchen can be added', async () => {
    renderManager()
    await screen.findByText(/you have no kitchens yet/i)

    fireEvent.click(screen.getByRole('button', { name: 'Add kitchen' }))
    expect(screen.getByLabelText('New kitchen name')).toHaveAttribute(
      'placeholder',
      'Name your kitchen',
    )
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
  })

  it('soft-deletes immediately (no confirm) and shows an Undo toast', async () => {
    mocks.results.select = { data: [beach], error: null }
    mocks.results.rpc = { data: beach, error: null }
    renderManager()
    await screen.findByText('Beach House')

    fireEvent.click(screen.getByRole('button', { name: 'Delete Beach House' }))

    await waitFor(() => expect(screen.queryByText('Beach House')).not.toBeInTheDocument())
    expect(mocks.rpcSpy).toHaveBeenCalledWith('soft_delete_kitchen', { kitchen_id: 'k1' })
    expect(mocks.toast).toHaveBeenCalledWith(
      'Kitchen moved to trash',
      expect.objectContaining({ duration: 8000 }),
    )
  })

  it('rolls back the optimistic soft delete when the RPC fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.results.select = { data: [beach], error: null }
    mocks.results.rpc = { data: null, error: { message: 'network' } }
    renderManager()
    await screen.findByText('Beach House')

    fireEvent.click(screen.getByRole('button', { name: 'Delete Beach House' }))

    await waitFor(() =>
      expect(mocks.toast.error).toHaveBeenCalledWith('Couldn\'t delete "Beach House". Try again.'),
    )
    expect(screen.getByText('Beach House')).toBeInTheDocument()
    spy.mockRestore()
  })
})
