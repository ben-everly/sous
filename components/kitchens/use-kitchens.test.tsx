import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Row = { id: string; name: string | null; created_at: string; deleted_at: string | null }
type RpcResult = { data: Row | null; error: null | { message: string } }

const mocks = vi.hoisted(() => ({
  results: {
    select: { data: [] as Row[], error: null as null | { message: string } },
    insert: { data: null as Row | null, error: null as null | { message: string } },
    update: { data: null as { id: string } | null, error: null as null | { message: string } },
    delete: { data: null as { id: string } | null, error: null as null | { message: string } },
    // A function lets a single act() drive per-kitchen outcomes (one delete succeeds, one fails).
    rpc: { data: null as Row | null, error: null as null | { message: string } } as
      | RpcResult
      | ((args: { kitchen_id: string }) => RpcResult),
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
    rpc: (name: string, args: { kitchen_id: string }) => {
      mocks.rpcSpy(name, args)
      const r =
        typeof mocks.results.rpc === 'function' ? mocks.results.rpc(args) : mocks.results.rpc
      return { then: (resolve: (v: unknown) => void) => resolve(r) }
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

  it('softDelete prepends a deleted_at-stamped copy when trash is loaded', async () => {
    const { result } = renderHook(() => useKitchens())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    mocks.results.select = { data: [], error: null }
    await act(async () => {
      result.current.loadTrash()
    })
    await waitFor(() => expect(result.current.trashStatus).toBe('ready'))

    const serverStamp = '2026-02-01T00:00:00.000Z'
    mocks.results.rpc = { data: { ...beach, deleted_at: serverStamp }, error: null }
    await act(async () => {
      await result.current.softDelete(beach)
    })

    expect(result.current.deleted).toHaveLength(1)
    expect(result.current.deleted![0].id).toBe('k1')
    // Reconciled to the DB's deleted_at, not the client clock.
    expect(result.current.deleted![0].deleted_at).toBe(serverStamp)
    expect(result.current.kitchens).toEqual([])
  })

  it('a failed softDelete overlapping a successful one does not revive the deleted kitchen', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const a: Row = { id: 'a', name: 'A', created_at: '2026-01-01', deleted_at: null }
    const b: Row = { id: 'b', name: 'B', created_at: '2026-01-02', deleted_at: null }
    mocks.results.select = { data: [a, b], error: null }
    const { result } = renderHook(() => useKitchens())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    // 'a' deletes cleanly; 'b' fails. Fire both from the same render's closures, before either
    // resolves, so a by-value rollback would restore a stale [a, b] snapshot and revive 'a'.
    mocks.results.rpc = ({ kitchen_id }) =>
      kitchen_id === 'b'
        ? { data: null, error: { message: 'boom' } }
        : { data: { ...a, deleted_at: '2026-03-01T00:00:00.000Z' }, error: null }
    const softDelete = result.current.softDelete
    await act(async () => {
      await Promise.all([softDelete(a), softDelete(b)])
    })

    expect(result.current.kitchens.some((k) => k.id === 'a')).toBe(false)
    expect(result.current.kitchens.map((k) => k.id)).toEqual(['b'])
    spy.mockRestore()
  })

  it('overlapping softDeletes keep both live and trash lists consistent when one fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const a: Row = { id: 'a', name: 'A', created_at: '2026-01-01', deleted_at: null }
    const b: Row = { id: 'b', name: 'B', created_at: '2026-01-02', deleted_at: null }
    mocks.results.select = { data: [a, b], error: null }
    const { result } = renderHook(() => useKitchens())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    mocks.results.select = { data: [], error: null } // trash loaded, currently empty
    await act(async () => {
      result.current.loadTrash()
    })
    await waitFor(() => expect(result.current.trashStatus).toBe('ready'))

    mocks.results.rpc = ({ kitchen_id }) =>
      kitchen_id === 'b'
        ? { data: null, error: { message: 'boom' } }
        : { data: { ...a, deleted_at: '2026-03-01T00:00:00.000Z' }, error: null }
    const softDelete = result.current.softDelete
    await act(async () => {
      await Promise.all([softDelete(a), softDelete(b)])
    })

    // 'a' deleted → in trash, not live; 'b' failed → back in live, not trash.
    expect(result.current.kitchens.map((k) => k.id)).toEqual(['b'])
    expect(result.current.deleted!.map((k) => k.id)).toEqual(['a'])
    spy.mockRestore()
  })

  it('a second softDelete of the same kitchen is dropped while the first is in flight', async () => {
    const { result } = renderHook(() => useKitchens())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    const softDelete = result.current.softDelete
    await act(async () => {
      await Promise.all([softDelete(beach), softDelete(beach)])
    })

    // Guard suppresses the duplicate, so only one RPC fires and beach stays deleted (not revived).
    expect(mocks.rpcSpy).toHaveBeenCalledTimes(1)
    expect(result.current.kitchens).toEqual([])
  })

  it('a failed undo re-inserts the kitchen into trash with its deletion timestamp intact', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderHook(() => useKitchens())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    mocks.results.select = { data: [], error: null }
    await act(async () => {
      result.current.loadTrash()
    })
    await waitFor(() => expect(result.current.trashStatus).toBe('ready'))

    await act(async () => {
      await result.current.softDelete(beach)
    })
    const undo = mocks.toast.mock.calls[0][1].action.onClick

    mocks.results.rpc = { data: null, error: { message: 'boom' } }
    await act(async () => {
      await undo()
    })

    expect(result.current.kitchens.some((k) => k.id === 'k1')).toBe(false)
    const row = result.current.deleted!.find((k) => k.id === 'k1')
    expect(typeof row!.deleted_at).toBe('string')
    spy.mockRestore()
  })

  it('restore failure rolls back and toasts an error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const trashed: Row = { ...beach, deleted_at: '2026-02-01' }
    const { result } = renderHook(() => useKitchens())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    mocks.results.select = { data: [trashed], error: null }
    await act(async () => {
      result.current.loadTrash()
    })
    await waitFor(() => expect(result.current.trashStatus).toBe('ready'))

    mocks.results.rpc = { data: null, error: { message: 'boom' } }
    await act(async () => {
      await result.current.restore(trashed)
    })

    expect(result.current.kitchens.some((k) => k.id === 'k1')).toBe(false)
    expect(result.current.deleted!.some((k) => k.id === 'k1')).toBe(true)
    expect(mocks.toast.error).toHaveBeenCalledWith('Couldn\'t restore "Beach House". Try again.')
    spy.mockRestore()
  })
})
