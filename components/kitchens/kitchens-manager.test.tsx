import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeWrapper } from '@/test/query-wrapper'
import { mockSupabase, resetMockSupabase, type Row } from '@/test/supabase-mock'
import { mockToast } from '@/test/toast-mock'
import { KitchensManager } from './kitchens-manager'

vi.mock('sonner')
vi.mock('@/lib/supabase/client')

const renderManager = () => render(<KitchensManager />, { wrapper: makeWrapper().wrapper })

beforeEach(() => {
  vi.resetAllMocks()
  resetMockSupabase()
})

afterEach(cleanup)

const beach: Row = { id: 'k1', name: 'Beach House', created_at: '2026-01-01', deleted_at: null }

describe('KitchensManager', () => {
  it('renders the owner kitchens after load', async () => {
    mockSupabase.results.select = { data: [beach], error: null }
    renderManager()
    expect(await screen.findByText('Beach House')).toBeInTheDocument()
  })

  it('shows a retry view on load failure, then the list when retried', async () => {
    mockSupabase.results.select = { data: null, error: { message: 'network' } }
    renderManager()

    expect(await screen.findByText('Could not load your kitchens.')).toBeInTheDocument()
    expect(screen.queryByText(/you have no kitchens yet/i)).not.toBeInTheDocument()

    mockSupabase.results.select = { data: [beach], error: null }
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Beach House')).toBeInTheDocument()
  })

  it('shows the empty state when there are no kitchens', async () => {
    renderManager()
    expect(await screen.findByText(/you have no kitchens yet/i)).toBeInTheDocument()
  })

  it('creates a named kitchen through the draft row and appends it', async () => {
    mockSupabase.results.select = { data: [beach], error: null }
    mockSupabase.results.insert = {
      data: { id: 'k2', name: 'Lake House', created_at: '2026-01-02', deleted_at: null },
      error: null,
    }
    renderManager()
    await screen.findByText('Beach House')

    fireEvent.click(screen.getByRole('button', { name: 'Add kitchen' }))
    fireEvent.change(screen.getByLabelText('New kitchen name'), { target: { value: 'Lake House' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(await screen.findByText('Lake House')).toBeInTheDocument()
    expect(mockSupabase.insertSpy).toHaveBeenCalledWith({ name: 'Lake House' })
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
    mockSupabase.results.select = { data: [beach], error: null }
    mockSupabase.results.rpc = { data: beach, error: null }
    renderManager()
    await screen.findByText('Beach House')

    fireEvent.click(screen.getByRole('button', { name: 'Delete Beach House' }))

    await waitFor(() => expect(screen.queryByText('Beach House')).not.toBeInTheDocument())
    expect(mockSupabase.rpcSpy).toHaveBeenCalledWith('soft_delete_kitchen', { kitchen_id: 'k1' })
    expect(mockToast).toHaveBeenCalledWith(
      '"Beach House" moved to trash',
      expect.objectContaining({ id: 'trash-k1', duration: 8000 }),
    )
  })

  it('rolls back the optimistic soft delete when the RPC fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockSupabase.results.select = { data: [beach], error: null }
    mockSupabase.results.rpc = { data: null, error: { message: 'network' } }
    renderManager()
    await screen.findByText('Beach House')

    fireEvent.click(screen.getByRole('button', { name: 'Delete Beach House' }))

    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith('Couldn\'t delete "Beach House". Try again.'),
    )
    expect(screen.getByText('Beach House')).toBeInTheDocument()
    spy.mockRestore()
  })
})
