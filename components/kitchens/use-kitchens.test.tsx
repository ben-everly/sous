import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Row = { id: string; name: string | null; created_at: string; deleted_at: string | null }
type RpcResult = { data: Row | null; error: null | { message: string } }

const mocks = vi.hoisted(() => ({
  results: {
    select: { data: [] as Row[] | null, error: null as null | { message: string } },
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
  // When true, select() reads park their resolver here instead of resolving, so a test can drain them
  // in any order to exercise out-of-order fetch resolution.
  deferSelect: false,
  selectResolvers: [] as Array<() => void>,
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
        then: (resolve: (v: unknown) => void) => {
          if (op === 'select' && mocks.deferSelect) {
            mocks.selectResolvers.push(() => resolve(mocks.results.select))
            return
          }
          resolve(mocks.results[op])
        },
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
  mocks.deferSelect = false
  mocks.selectResolvers = []
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
    await act(async () => {
      await result.current.loadTrash()
    })
    expect(result.current.deleted).toEqual([trashed])
  })

  it('derives the trash count from the loaded set and keeps it in sync across delete/restore', async () => {
    const trashedA: Row = {
      id: 'd1',
      name: 'Old A',
      created_at: '2025-01-01',
      deleted_at: '2026-01-01',
    }
    const trashedB: Row = {
      id: 'd2',
      name: 'Old B',
      created_at: '2025-01-02',
      deleted_at: '2026-01-02',
    }
    // One mount read seeds both partitions, so the count is exact immediately — no separate query.
    mocks.results.select = { data: [beach, trashedA, trashedB], error: null }
    const { result } = renderHook(() => useKitchens())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.trashCount).toBe(2)

    // Soft-delete moves beach into trash: the count follows with no manual bookkeeping.
    await act(async () => {
      await result.current.softDelete(beach)
    })
    expect(result.current.trashCount).toBe(3)

    // Undo restores beach and the count follows back down.
    const undo = mocks.toast.mock.calls[0][1].action.onClick
    await act(async () => {
      await undo()
    })
    expect(result.current.trashCount).toBe(2)
  })

  it('loadTrash refetches fresh data on reopen', async () => {
    const first: Row = { ...beach, deleted_at: '2026-02-01' }
    const { result } = renderHook(() => useKitchens())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    mocks.results.select = { data: [first], error: null }
    await act(async () => {
      await result.current.loadTrash()
    })
    expect(result.current.deleted).toEqual([first])

    // Reopen: the item was purged elsewhere, so a refetch should reflect the now-empty trash.
    mocks.results.select = { data: [], error: null }
    await act(async () => {
      await result.current.loadTrash()
    })
    expect(result.current.trashStatus).toBe('ready')
    expect(result.current.deleted).toEqual([])
  })

  it('ignores a slow reopen refetch that resolves after a newer one (no stale overwrite)', async () => {
    const stale: Row = { ...beach, deleted_at: '2026-02-01' }
    const { result } = renderHook(() => useKitchens())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    // Two overlapping reopens: #1 (older) then #2 (newer), neither resolved yet.
    mocks.deferSelect = true
    let older!: Promise<void>
    let newer!: Promise<void>
    await act(async () => {
      older = result.current.loadTrash()
    })
    await act(async () => {
      newer = result.current.loadTrash()
    })
    expect(mocks.selectResolvers).toHaveLength(2)

    // Resolve the NEWER fetch first with fresh (empty) trash...
    mocks.results.select = { data: [], error: null }
    await act(async () => {
      mocks.selectResolvers[1]()
      await newer
    })
    // ...then the OLDER fetch with stale data — it must be discarded, not painted over the newer one.
    mocks.results.select = { data: [stale], error: null }
    await act(async () => {
      mocks.selectResolvers[0]()
      await older
    })

    expect(result.current.deleted).toEqual([])
  })

  it('keeps the loaded trash list when a reopen refetch fails, instead of blanking to an error', async () => {
    const first: Row = { ...beach, deleted_at: '2026-02-01' }
    const { result } = renderHook(() => useKitchens())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    mocks.results.select = { data: [first], error: null }
    await act(async () => {
      await result.current.loadTrash()
    })

    // Reopen while offline: the refetch errors, but the already-loaded list must stay visible.
    mocks.results.select = { data: null, error: { message: 'offline' } }
    await act(async () => {
      await result.current.loadTrash()
    })

    expect(result.current.trashStatus).toBe('ready')
    expect(result.current.deleted).toEqual([first])
  })

  it('softDelete prepends a deleted_at-stamped copy when trash is loaded', async () => {
    const { result } = renderHook(() => useKitchens())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    mocks.results.select = { data: [], error: null }
    await act(async () => {
      await result.current.loadTrash()
    })

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
      await result.current.loadTrash()
    })

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
      await result.current.loadTrash()
    })

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

  it('purge failure rolls back and toasts a distinct permanent-delete error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const trashed: Row = { ...beach, deleted_at: '2026-02-01' }
    const { result } = renderHook(() => useKitchens())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    mocks.results.select = { data: [trashed], error: null }
    await act(async () => {
      await result.current.loadTrash()
    })

    mocks.results.rpc = { data: null, error: { message: 'boom' } }
    await act(async () => {
      await result.current.purge(trashed)
    })

    expect(result.current.deleted!.some((k) => k.id === 'k1')).toBe(true)
    expect(mocks.rpcSpy).toHaveBeenCalledWith('purge_kitchen', { kitchen_id: 'k1' })
    expect(mocks.toast.error).toHaveBeenCalledWith(
      'Couldn\'t permanently delete "Beach House". It\'s still in your trash.',
    )
    spy.mockRestore()
  })

  it('undo still works when the trash panel opened mid-delete and its read missed the row', async () => {
    const { result } = renderHook(() => useKitchens())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    await act(async () => {
      await result.current.softDelete(beach)
    })
    const undo = mocks.toast.mock.calls[0][1].action.onClick

    // Panel opened while the soft-delete was in flight: the trash read committed before beach did,
    // so it comes back empty. A wholesale reseed would drop beach from trashedIds and strand it.
    mocks.results.select = { data: [], error: null }
    await act(async () => {
      await result.current.loadTrash()
    })

    await act(async () => {
      await undo()
    })

    expect(result.current.kitchens).toEqual([beach])
    expect(mocks.toast.error).not.toHaveBeenCalled()
  })

  it('a stale undo after a trash-panel restore is a no-op (does not resurrect the kitchen)', async () => {
    const { result } = renderHook(() => useKitchens())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    await act(async () => {
      await result.current.softDelete(beach)
    })
    const undo = mocks.toast.mock.calls[0][1].action.onClick

    // Open trash, restore beach from the panel — beach is live again.
    const trashed: Row = { ...beach, deleted_at: '2026-02-01' }
    mocks.results.select = { data: [trashed], error: null }
    await act(async () => {
      await result.current.loadTrash()
    })
    await act(async () => {
      await result.current.restore(trashed)
    })
    expect(result.current.kitchens).toEqual([beach])
    expect(result.current.deleted).toEqual([])

    // Beach is already live, so the DB's deleted_at guard makes this restore a null no-op. The stale
    // toast must not read that as a failure and roll the live kitchen back into the trash.
    mocks.results.rpc = { data: null, error: null }
    mocks.rpcSpy.mockClear()
    await act(async () => {
      await undo()
    })

    expect(result.current.kitchens).toEqual([beach])
    expect(result.current.deleted).toEqual([])
    expect(mocks.rpcSpy).not.toHaveBeenCalled()
    expect(mocks.toast.error).not.toHaveBeenCalled()
  })

  it('restore failure rolls back and toasts an error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const trashed: Row = { ...beach, deleted_at: '2026-02-01' }
    const { result } = renderHook(() => useKitchens())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    mocks.results.select = { data: [trashed], error: null }
    await act(async () => {
      await result.current.loadTrash()
    })

    mocks.results.rpc = { data: null, error: { message: 'boom' } }
    await act(async () => {
      await result.current.restore(trashed)
    })

    expect(result.current.kitchens.some((k) => k.id === 'k1')).toBe(false)
    expect(result.current.deleted!.some((k) => k.id === 'k1')).toBe(true)
    expect(mocks.toast.error).toHaveBeenCalledWith('Couldn\'t restore "Beach House". Try again.')
    spy.mockRestore()
  })

  it('a re-delete after a restore is not stranded by a racing empty trash refetch', async () => {
    const trashed: Row = { ...beach, deleted_at: '2026-02-01' }
    const { result } = renderHook(() => useKitchens())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    // Delete beach, open trash (confirming it), then restore it from the panel.
    await act(async () => {
      await result.current.softDelete(beach)
    })
    mocks.results.select = { data: [trashed], error: null }
    await act(async () => {
      await result.current.loadTrash()
    })
    await act(async () => {
      await result.current.restore(trashed)
    })
    expect(result.current.kitchens).toEqual([beach])

    // Delete beach a second time; a trash refetch then races ahead of the delete and comes back empty.
    // The stale confirmation from the first cycle must not drop this fresh optimistic delete.
    await act(async () => {
      await result.current.softDelete(beach)
    })
    mocks.results.select = { data: [], error: null }
    await act(async () => {
      await result.current.loadTrash()
    })

    expect(result.current.deleted!.some((k) => k.id === 'k1')).toBe(true)
    expect(result.current.kitchens.some((k) => k.id === 'k1')).toBe(false)
  })
})
