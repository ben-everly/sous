'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  encode,
  useDeleteItem,
  useInsertMutation,
  useQuery,
  useUpdateMutation,
  useUpsertItem,
} from '@supabase-cache-helpers/postgrest-react-query'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { inFlight } from '@/lib/data/in-flight'
import { kitchenLabel } from '@/lib/kitchens/kitchen-label'
import {
  COLUMNS,
  allKitchensQuery,
  purgeKitchen,
  restoreKitchen,
  softDeleteKitchen,
} from '@/lib/kitchens/queries'
import type { Kitchen } from '@/lib/kitchens/types'

export type KitchensStatus = 'loading' | 'error' | 'ready'

// Matches the DB's order so a restored kitchen lands back in its original slot, not at the end.
const byCreatedThenId = (a: Kitchen, b: Kitchen) =>
  a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)

// id tiebreak gives the trash a total order.
const byDeletedAtDesc = (a: Kitchen, b: Kitchen) =>
  (b.deleted_at ?? '').localeCompare(a.deleted_at ?? '') || a.id.localeCompare(b.id)

const flightKey = (id: string) => `kitchen:${id}`

// The RPCs return a full public.kitchens row (owner_id, updated_at); the read cache only holds these
// four columns, so project before writing to keep the cached shape uniform.
const project = (k: Kitchen): Kitchen => ({
  id: k.id,
  name: k.name,
  created_at: k.created_at,
  deleted_at: k.deleted_at,
})

export function useKitchens() {
  const [supabase] = useState(createClient)
  const queryClient = useQueryClient()

  const query = useQuery(allKitchensQuery(supabase), {
    // The single read is the source of truth; loadTrash reconciles it by hand and the mutations patch
    // it by PK, so a background refetch must never silently clobber optimistic rows.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
  const queryKey = useMemo(() => encode(allKitchensQuery(supabase), false), [supabase])

  const rows = useMemo(() => (query.data ?? []) as Kitchen[], [query.data])
  // Latest rows, for restore()'s membership guard and rename()'s no-op check: a stale Undo toast fires
  // long after render, so its closure can't read current state — the ref can.
  const rowsRef = useRef(rows)
  rowsRef.current = rows

  // Ids a server read has reported as trashed. Only these are dropped when a later read omits them
  // (restored/purged elsewhere); a row known only from a local optimistic soft-delete isn't here, so a
  // read that raced ahead of that delete can't strand it. Seeded once from the mount read, then kept in
  // sync by loadTrash and cleared when a row leaves the trash.
  const confirmedTrashed = useRef(new Set<string>())
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current || !query.data) return
    seeded.current = true
    for (const k of query.data as Kitchen[]) if (k.deleted_at) confirmedTrashed.current.add(k.id)
  }, [query.data])

  // Bumped per loadTrash; a fetch applies only if it's still the latest, so overlapping reopens can't
  // resolve out of order and paint stale trash.
  const trashSeq = useRef(0)

  const upsertItem = useUpsertItem<Kitchen>({
    table: 'kitchens',
    schema: 'public',
    primaryKeys: ['id'],
  })
  const deleteItem = useDeleteItem<Kitchen>({
    table: 'kitchens',
    schema: 'public',
    primaryKeys: ['id'],
  })

  const kitchens = useMemo(() => rows.filter((k) => !k.deleted_at).sort(byCreatedThenId), [rows])
  const deleted = useMemo(() => rows.filter((k) => k.deleted_at).sort(byDeletedAtDesc), [rows])
  const trashCount = deleted.length

  const status: KitchensStatus =
    query.data === undefined ? (query.isError ? 'error' : 'loading') : 'ready'

  const retry = () => void query.refetch()

  const loadTrash = useCallback(async () => {
    const seq = ++trashSeq.current
    const { data, error } = await allKitchensQuery(supabase)
    if (seq !== trashSeq.current) return // superseded by a newer open
    if (error || !data) return // keep the already-loaded list rather than blanking
    const serverIds = new Set(data.map((k) => k.id))
    for (const k of data as Kitchen[])
      if (k.deleted_at && !inFlight.has(flightKey(k.id))) confirmedTrashed.current.add(k.id)
    queryClient.setQueryData<{ data: Kitchen[] | null }>(queryKey, (prev) => {
      const byId = new Map((prev?.data ?? []).map((k) => [k.id, k]))
      // Drop only previously-confirmed trashed rows this read omits (restored/purged elsewhere). Skip
      // in-flight ids and unconfirmed optimistic deletes so a read racing ahead of a local mutation can
      // neither strand a row nor clobber its optimistic state.
      for (const [id, k] of byId)
        if (
          k.deleted_at &&
          confirmedTrashed.current.has(id) &&
          !serverIds.has(id) &&
          !inFlight.has(flightKey(id))
        )
          byId.delete(id)
      for (const k of data as Kitchen[]) if (!inFlight.has(flightKey(k.id))) byId.set(k.id, k)
      const next = [...byId.values()]
      return { ...(prev ?? {}), data: next, count: next.length }
    })
  }, [supabase, queryClient, queryKey])

  const insert = useInsertMutation(supabase.from('kitchens'), ['id'], COLUMNS)
  const update = useUpdateMutation(supabase.from('kitchens'), ['id'], COLUMNS)

  const create = async (name: string) => {
    try {
      const inserted = await insert.mutateAsync([{ name }])
      if (inserted?.[0]) return true
    } catch {
      // fall through to the shared failure path
    }
    toast.error("Couldn't create the kitchen. Try again.")
    return false
  }

  const rename = async (id: string, name: string) => {
    if (name === rowsRef.current.find((k) => k.id === id)?.name) return true
    try {
      // useUpdateMutation's fetcher is .single(), so a 0-row match (RLS-filtered / stale id) rejects.
      await update.mutateAsync({ id, name })
      return true
    } catch {
      toast.error("Couldn't rename the kitchen. Try again.")
      return false
    }
  }

  // A second delete/restore/purge of the same kitchen while one is in flight would hit the RPC's
  // deleted_at-guard no-op and roll back the first call's success, so drop it.
  const runExclusive = async (id: string, fn: () => Promise<unknown>) => {
    const key = flightKey(id)
    if (inFlight.has(key)) return
    inFlight.add(key)
    try {
      await fn()
    } catch {
      // fn rolls back its own optimistic write and toasts before returning; swallow so a rejected
      // cache write can't leave the id stuck in the registry.
    } finally {
      inFlight.delete(key)
    }
  }

  const restore = (kitchen: Kitchen) => {
    // Already live (restored/purged elsewhere): a stale Undo would roll live state back. Read the ref,
    // not the render closure, so a long-delayed toast sees current membership. Absent from the cache
    // (e.g. a reopen read missed it) still counts as trashed, so the undo proceeds.
    const current = rowsRef.current.find((k) => k.id === kitchen.id)
    if (current && !current.deleted_at) return Promise.resolve()
    return runExclusive(kitchen.id, async () => {
      await queryClient.cancelQueries({ queryKey })
      confirmedTrashed.current.delete(kitchen.id)
      await upsertItem(project({ ...kitchen, deleted_at: null }))
      const row = await restoreKitchen(supabase, kitchen.id)
      if (!row) {
        await upsertItem(kitchen)
        toast.error(`Couldn't restore "${kitchenLabel(kitchen.name)}". Try again.`)
        return
      }
      await upsertItem(project(row))
    })
  }

  const softDelete = (kitchen: Kitchen) =>
    runExclusive(kitchen.id, async () => {
      await queryClient.cancelQueries({ queryKey })
      // Client timestamp so an already-open trash list shows "deleted now" without a refetch; replaced
      // with the DB's authoritative value once the RPC returns. Captured for the undo toast (not the
      // live `kitchen`) so a failed undo re-inserts the row with a timestamp.
      const trashed = { ...kitchen, deleted_at: new Date().toISOString() }
      await upsertItem(project(trashed))
      const row = await softDeleteKitchen(supabase, kitchen.id)
      if (!row) {
        await upsertItem(project({ ...kitchen, deleted_at: null }))
        toast.error(`Couldn't delete "${kitchenLabel(kitchen.name)}". Try again.`)
        return
      }
      // Reconcile the optimistic stamp with the DB's; keep the stamp if the RPC returned none so the
      // row stays trashed (membership is derived from deleted_at).
      await upsertItem(project({ ...trashed, deleted_at: row.deleted_at ?? trashed.deleted_at }))
      toast('Kitchen moved to trash', {
        duration: 8000,
        action: { label: 'Undo', onClick: () => restore(trashed) },
      })
    })

  const purge = (kitchen: Kitchen) =>
    runExclusive(kitchen.id, async () => {
      await queryClient.cancelQueries({ queryKey })
      confirmedTrashed.current.delete(kitchen.id)
      await deleteItem(kitchen)
      if (!(await purgeKitchen(supabase, kitchen.id))) {
        await upsertItem(kitchen)
        toast.error(
          `Couldn't permanently delete "${kitchenLabel(kitchen.name)}". It's still in your trash.`,
        )
      }
    })

  return {
    kitchens,
    status,
    retry,
    create,
    rename,
    softDelete,
    deleted,
    trashCount,
    loadTrash,
    restore,
    purge,
  }
}
