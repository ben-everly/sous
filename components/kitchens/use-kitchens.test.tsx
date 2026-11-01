import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeWrapper } from '@/test/query-wrapper'
import { mockSupabase, resetMockSupabase, type Row } from '@/test/supabase-mock'
import { mockToast } from '@/test/toast-mock'
import { useKitchens } from './use-kitchens'

vi.mock('sonner')
vi.mock('@/lib/supabase/client')

const renderUseKitchens = () => renderHook(() => useKitchens(), { wrapper: makeWrapper().wrapper })

const beach: Row = { id: 'k1', name: 'Beach House', created_at: '2026-01-01', deleted_at: null }
const trashedBeach: Row = { ...beach, deleted_at: '2026-02-01' }

beforeEach(() => {
  vi.resetAllMocks()
  resetMockSupabase()
  mockSupabase.results.select = { data: [beach], error: null }
  mockSupabase.results.rpc = { data: beach, error: null }
})

afterEach(() => vi.restoreAllMocks())

describe('useKitchens', () => {
  it('loads the live list', async () => {
    const { result } = renderUseKitchens()
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.kitchens).toEqual([beach])
  })

  it('surfaces error status when the initial load fails', async () => {
    mockSupabase.results.select = { data: null, error: { message: 'offline' } }
    const { result } = renderUseKitchens()
    await waitFor(() => expect(result.current.status).toBe('error'))
  })

  it('softDelete removes the row and fires an 8s undo toast', async () => {
    const { result } = renderUseKitchens()
    await waitFor(() => expect(result.current.status).toBe('ready'))

    // Server truth after the delete: beach is now trashed. The settle refetch reconciles to it.
    mockSupabase.results.select = { data: [trashedBeach], error: null }
    await act(async () => {
      result.current.softDelete(beach)
    })

    await waitFor(() => expect(result.current.kitchens).toEqual([]))
    expect(mockSupabase.rpcSpy).toHaveBeenCalledWith('soft_delete_kitchen', { kitchen_id: 'k1' })
    const [message, opts] = mockToast.mock.calls[0]
    expect(message).toBe('"Beach House" moved to trash')
    expect(opts.id).toBe('trash-k1')
    expect(opts.duration).toBe(8000)
    expect(opts.action.label).toBe('Undo')
  })

  it('undo restores the kitchen to the live list', async () => {
    const { result } = renderUseKitchens()
    await waitFor(() => expect(result.current.status).toBe('ready'))

    mockSupabase.results.select = { data: [trashedBeach], error: null }
    await act(async () => {
      result.current.softDelete(beach)
    })
    await waitFor(() => expect(result.current.kitchens).toEqual([]))

    const undo = mockToast.mock.calls[0][1].action.onClick
    mockSupabase.results.select = { data: [beach], error: null }
    await act(async () => {
      undo()
    })

    await waitFor(() => expect(result.current.kitchens).toEqual([beach]))
  })

  it('rolls back softDelete and toasts an error when the RPC fails', async () => {
    mockSupabase.results.rpc = { data: null, error: { message: 'boom' } }
    const { result } = renderUseKitchens()
    await waitFor(() => expect(result.current.status).toBe('ready'))

    await act(async () => {
      result.current.softDelete(beach)
    })

    // The failed delete rolls back optimistically and the settle refetch confirms beach is still live.
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith('Couldn\'t delete "Beach House". Try again.'),
    )
    await waitFor(() => expect(result.current.kitchens).toEqual([beach]))
  })

  it('renames a kitchen in place', async () => {
    mockSupabase.results.update = { data: { ...beach, name: 'Lake House' }, error: null }
    const { result } = renderUseKitchens()
    await waitFor(() => expect(result.current.status).toBe('ready'))

    let ok!: boolean
    await act(async () => {
      ok = await result.current.rename('k1', 'Lake House')
    })

    expect(ok).toBe(true)
    expect(result.current.kitchens.map((k) => k.name)).toEqual(['Lake House'])
  })

  it('no-ops a rename to the current name without hitting the DB', async () => {
    const { result } = renderUseKitchens()
    await waitFor(() => expect(result.current.status).toBe('ready'))

    let ok!: boolean
    await act(async () => {
      ok = await result.current.rename('k1', 'Beach House')
    })

    expect(ok).toBe(true)
    expect(result.current.kitchens).toEqual([beach])
  })

  it('reports failure and toasts when a rename matches no row', async () => {
    mockSupabase.results.update = { data: null, error: { message: 'boom' } }
    const { result } = renderUseKitchens()
    await waitFor(() => expect(result.current.status).toBe('ready'))

    let ok!: boolean
    await act(async () => {
      ok = await result.current.rename('k1', 'Lake House')
    })

    expect(ok).toBe(false)
    expect(mockToast.error).toHaveBeenCalledWith("Couldn't rename the kitchen. Try again.")
    expect(result.current.kitchens).toEqual([beach])
  })

  it('refresh refetches and populates the trash list', async () => {
    const { result } = renderUseKitchens()
    await waitFor(() => expect(result.current.status).toBe('ready'))

    mockSupabase.results.select = { data: [trashedBeach], error: null }
    await act(async () => {
      await result.current.refresh()
    })
    await waitFor(() => expect(result.current.deleted).toEqual([trashedBeach]))
  })

  it('refresh refetches fresh data on reopen', async () => {
    const { result } = renderUseKitchens()
    await waitFor(() => expect(result.current.status).toBe('ready'))

    mockSupabase.results.select = { data: [trashedBeach], error: null }
    await act(async () => {
      await result.current.refresh()
    })
    await waitFor(() => expect(result.current.deleted).toEqual([trashedBeach]))

    // Reopen: the item was purged elsewhere, so a refetch should reflect the now-empty trash.
    mockSupabase.results.select = { data: [], error: null }
    await act(async () => {
      await result.current.refresh()
    })
    await waitFor(() => expect(result.current.deleted).toEqual([]))
  })

  it('keeps the loaded trash list when a reopen refetch fails, instead of blanking to an error', async () => {
    const { result } = renderUseKitchens()
    await waitFor(() => expect(result.current.status).toBe('ready'))

    mockSupabase.results.select = { data: [trashedBeach], error: null }
    await act(async () => {
      await result.current.refresh()
    })
    await waitFor(() => expect(result.current.deleted).toEqual([trashedBeach]))

    // Reopen while offline: the refetch errors, but the already-loaded list must stay visible.
    mockSupabase.results.select = { data: null, error: { message: 'offline' } }
    await act(async () => {
      await result.current.refresh()
    })

    expect(result.current.deleted).toEqual([trashedBeach])
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
    // One read seeds both partitions, so the count is exact immediately — no separate query.
    mockSupabase.results.select = { data: [beach, trashedA, trashedB], error: null }
    const { result } = renderUseKitchens()
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.deleted).toHaveLength(2)

    mockSupabase.results.select = { data: [trashedBeach, trashedA, trashedB], error: null }
    await act(async () => {
      result.current.softDelete(beach)
    })
    await waitFor(() => expect(result.current.deleted).toHaveLength(3))

    const undo = mockToast.mock.calls[0][1].action.onClick
    mockSupabase.results.select = { data: [beach, trashedA, trashedB], error: null }
    await act(async () => {
      undo()
    })
    await waitFor(() => expect(result.current.deleted).toHaveLength(2))
  })

  it('reconciles the optimistic soft-delete stamp with the DB deleted_at on the settle refetch', async () => {
    const { result } = renderUseKitchens()
    await waitFor(() => expect(result.current.status).toBe('ready'))

    const serverStamp = '2026-02-01T00:00:00.000Z'
    mockSupabase.results.select = { data: [{ ...beach, deleted_at: serverStamp }], error: null }
    await act(async () => {
      result.current.softDelete(beach)
    })

    await waitFor(() => expect(result.current.deleted).toHaveLength(1))
    expect(result.current.deleted[0].id).toBe('k1')
    // Reconciled to the DB's deleted_at, not the client clock.
    expect(result.current.deleted[0].deleted_at).toBe(serverStamp)
    expect(result.current.kitchens).toEqual([])
  })

  it('overlapping soft-deletes reconcile to server truth when one fails', async () => {
    const a: Row = { id: 'a', name: 'A', created_at: '2026-01-01', deleted_at: null }
    const b: Row = { id: 'b', name: 'B', created_at: '2026-01-02', deleted_at: null }
    mockSupabase.results.select = { data: [a, b], error: null }
    const { result } = renderUseKitchens()
    await waitFor(() => expect(result.current.status).toBe('ready'))

    // 'a' deletes cleanly; 'b' fails. Server truth: a trashed, b still live.
    mockSupabase.results.rpc = ({ kitchen_id }) =>
      kitchen_id === 'b'
        ? { data: null, error: { message: 'boom' } }
        : { data: { ...a, deleted_at: '2026-03-01T00:00:00.000Z' }, error: null }
    mockSupabase.results.select = {
      data: [{ ...a, deleted_at: '2026-03-01T00:00:00.000Z' }, b],
      error: null,
    }
    const softDelete = result.current.softDelete
    await act(async () => {
      softDelete(a)
      softDelete(b)
    })

    // 'a' deleted → in trash, not live; 'b' failed → back in live, not trash.
    await waitFor(() => expect(result.current.kitchens.map((k) => k.id)).toEqual(['b']))
    expect(result.current.deleted.map((k) => k.id)).toEqual(['a'])
  })

  it('a second soft-delete of the same kitchen while one is in flight is a harmless success', async () => {
    const { result } = renderUseKitchens()
    await waitFor(() => expect(result.current.status).toBe('ready'))

    // No in-flight guard now: both fire the (idempotent) RPC and the row still ends up trashed.
    mockSupabase.results.select = { data: [trashedBeach], error: null }
    const softDelete = result.current.softDelete
    await act(async () => {
      softDelete(beach)
      softDelete(beach)
    })

    await waitFor(() => expect(result.current.kitchens).toEqual([]))
    expect(mockSupabase.rpcSpy).toHaveBeenCalledTimes(2)
    expect(mockToast.error).not.toHaveBeenCalled()
    // Both success toasts share one id, so sonner collapses them into a single undo affordance.
    const ids = mockToast.mock.calls.map(([, opts]) => opts.id)
    expect(ids).toEqual(['trash-k1', 'trash-k1'])
  })

  it('a stale undo after a trash-panel restore fires a harmless no-op restore', async () => {
    const { result } = renderUseKitchens()
    await waitFor(() => expect(result.current.status).toBe('ready'))

    mockSupabase.results.select = { data: [trashedBeach], error: null }
    await act(async () => {
      result.current.softDelete(beach)
    })
    await waitFor(() => expect(result.current.deleted).toEqual([trashedBeach]))
    const undo = mockToast.mock.calls[0][1].action.onClick

    mockSupabase.results.select = { data: [beach], error: null }
    await act(async () => {
      result.current.restore(trashedBeach)
    })
    await waitFor(() => expect(result.current.kitchens).toEqual([beach]))

    // Beach is already live, so the DB's deleted_at guard makes this restore a no-op success. The RPC
    // still fires, but it does not resurrect anything or read as a failure.
    mockSupabase.results.rpc = { data: null, error: null }
    mockSupabase.rpcSpy.mockClear()
    await act(async () => {
      undo()
    })

    await waitFor(() =>
      expect(mockSupabase.rpcSpy).toHaveBeenCalledWith('restore_kitchen', { kitchen_id: 'k1' }),
    )
    expect(result.current.kitchens).toEqual([beach])
    expect(result.current.deleted).toEqual([])
    expect(mockToast.error).not.toHaveBeenCalled()
  })

  it('restore failure rolls back and toasts an error', async () => {
    const { result } = renderUseKitchens()
    await waitFor(() => expect(result.current.status).toBe('ready'))

    mockSupabase.results.select = { data: [trashedBeach], error: null }
    await act(async () => {
      await result.current.refresh()
    })
    await waitFor(() => expect(result.current.deleted).toEqual([trashedBeach]))

    mockSupabase.results.rpc = { data: null, error: { message: 'boom' } }
    await act(async () => {
      result.current.restore(trashedBeach)
    })

    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith('Couldn\'t restore "Beach House". Try again.'),
    )
    await waitFor(() => expect(result.current.deleted.some((k) => k.id === 'k1')).toBe(true))
    expect(result.current.kitchens.some((k) => k.id === 'k1')).toBe(false)
  })

  it('purge removes the kitchen from trash', async () => {
    const { result } = renderUseKitchens()
    await waitFor(() => expect(result.current.status).toBe('ready'))

    mockSupabase.results.select = { data: [trashedBeach], error: null }
    await act(async () => {
      await result.current.refresh()
    })
    await waitFor(() => expect(result.current.deleted).toEqual([trashedBeach]))

    mockSupabase.results.select = { data: [], error: null }
    await act(async () => {
      result.current.purge(trashedBeach)
    })

    await waitFor(() => expect(result.current.deleted).toEqual([]))
    expect(mockSupabase.rpcSpy).toHaveBeenCalledWith('purge_kitchen', { kitchen_id: 'k1' })
  })

  it('purge failure rolls back and toasts a permanent-delete error', async () => {
    const { result } = renderUseKitchens()
    await waitFor(() => expect(result.current.status).toBe('ready'))

    mockSupabase.results.select = { data: [trashedBeach], error: null }
    await act(async () => {
      await result.current.refresh()
    })
    await waitFor(() => expect(result.current.deleted).toEqual([trashedBeach]))

    mockSupabase.results.rpc = { data: null, error: { message: 'boom' } }
    await act(async () => {
      result.current.purge(trashedBeach)
    })

    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(
        'Couldn\'t permanently delete "Beach House". Try again.',
      ),
    )
    await waitFor(() => expect(result.current.deleted.some((k) => k.id === 'k1')).toBe(true))
    expect(mockSupabase.rpcSpy).toHaveBeenCalledWith('purge_kitchen', { kitchen_id: 'k1' })
  })
})
