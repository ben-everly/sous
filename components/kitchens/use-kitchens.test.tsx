import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Row = { id: string; name: string | null; created_at: string; deleted_at: string | null }

const mocks = vi.hoisted(() => ({
  results: {
    select: { data: [] as Row[], error: null as null | { message: string } },
    insert: { data: null as Row | null, error: null as null | { message: string } },
    update: { data: null as { id: string } | null, error: null as null | { message: string } },
    delete: { data: null as { id: string } | null, error: null as null | { message: string } },
    rpc: { data: null as Row | null, error: null as null | { message: string } },
  },
  rpcSpy: vi.fn(),
  // sonner's toast is both a function (the undo toast) and an object with .error.
  toast: Object.assign(vi.fn(), { error: vi.fn() }),
}))

vi.mock('sonner', () => ({ toast: mocks.toast }))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => {
      let op: 'select' | 'insert' | 'update' | 'delete' = 'select'
      const chain = {
        select: () => chain,
        insert: () => {
          op = 'insert'
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

import { useKitchens } from './use-kitchens'

const beach: Row = { id: 'k1', name: 'Beach House', created_at: '2026-01-01', deleted_at: null }

beforeEach(() => {
  mocks.results.select = { data: [beach], error: null }
  mocks.results.insert = { data: null, error: null }
  mocks.results.update = { data: null, error: null }
  mocks.results.delete = { data: null, error: null }
  mocks.results.rpc = { data: beach, error: null }
  mocks.rpcSpy.mockReset()
  mocks.toast.mockReset()
  mocks.toast.error.mockReset()
})

afterEach(() => vi.restoreAllMocks())

describe('useKitchens', () => {
  it('loads the live list', async () => {
    const { result } = renderHook(() => useKitchens())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.kitchens).toEqual([beach])
  })

  it('softDelete removes the row and fires an 8s undo toast', async () => {
    const { result } = renderHook(() => useKitchens())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    await act(async () => {
      await result.current.softDelete(beach)
    })

    expect(result.current.kitchens).toEqual([])
    expect(mocks.rpcSpy).toHaveBeenCalledWith('soft_delete_kitchen', { kitchen_id: 'k1' })
    const [message, opts] = mocks.toast.mock.calls[0]
    expect(message).toBe('Kitchen moved to trash')
    expect(opts.duration).toBe(8000)
    expect(opts.action.label).toBe('Undo')
  })

  it('undo restores the kitchen to the live list', async () => {
    const { result } = renderHook(() => useKitchens())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    await act(async () => {
      await result.current.softDelete(beach)
    })
    const undo = mocks.toast.mock.calls[0][1].action.onClick
    await act(async () => {
      await undo()
    })

    expect(result.current.kitchens).toEqual([beach])
  })

  it('rolls back softDelete and toasts an error when the RPC fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.results.rpc = { data: null, error: { message: 'boom' } }
    const { result } = renderHook(() => useKitchens())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    await act(async () => {
      await result.current.softDelete(beach)
    })

    expect(result.current.kitchens).toEqual([beach])
    expect(mocks.toast.error).toHaveBeenCalledWith('Couldn\'t delete "Beach House". Try again.')
    spy.mockRestore()
  })

  it('loadTrash populates the trash list', async () => {
    const trashed: Row = { ...beach, deleted_at: '2026-02-01' }
    const { result } = renderHook(() => useKitchens())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    mocks.results.select = { data: [trashed], error: null }
    act(() => {
      result.current.loadTrash()
    })
    await waitFor(() => expect(result.current.trashStatus).toBe('ready'))
    expect(result.current.deleted).toEqual([trashed])
  })
})
