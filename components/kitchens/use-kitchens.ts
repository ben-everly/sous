'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { kitchenLabel } from '@/lib/kitchens/kitchen-label'
import {
  createKitchen,
  listAllKitchens,
  listDeletedKitchens,
  purgeKitchen,
  renameKitchen,
  restoreKitchen,
  softDeleteKitchen,
} from '@/lib/kitchens/queries'
import type { Kitchen } from '@/lib/kitchens/types'

export type KitchensStatus = 'loading' | 'error' | 'ready'
export type TrashStatus = 'idle' | 'loading' | 'error' | 'ready'

// Live list order: created_at asc, id tiebreak — matches the DB so a restored kitchen lands back in
// its original slot rather than at the end.
const byCreatedThenId = (a: Kitchen, b: Kitchen) =>
  a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)

// Trash order: most-recently-deleted first, id tiebreak for a total order.
const byDeletedAtDesc = (a: Kitchen, b: Kitchen) =>
  (b.deleted_at ?? '').localeCompare(a.deleted_at ?? '') || a.id.localeCompare(b.id)

type ById = Record<string, Kitchen>

export function useKitchens() {
  const [supabase] = useState(createClient)
  // Single source of truth for every kitchen the client knows about; `deleted_at` is the live/trash
  // discriminator. Both lists and the trash count derive from this, so a mutation flips one field and
  // a rollback flips it back — no parallel arrays or id sets to keep in sync.
  const [byId, setById] = useState<ById>({})
  const [status, setStatus] = useState<KitchensStatus>('loading')
  const [trashStatus, setTrashStatus] = useState<TrashStatus>('idle')
  // Ids with a mutation in flight. A second delete/restore/purge of the same kitchen would hit the
  // RPC's deleted_at-guard no-op (null → "failure") and roll back the first call's success, so drop it.
  const pending = useRef(new Set<string>())
  // Bumped per loadTrash; a fetch applies only if it's still the latest, so overlapping reopens can't
  // resolve out of order and paint stale trash.
  const trashLoadSeq = useRef(0)
  // Ids a trash read has reported. Only these are dropped when a later read omits them (restored/purged
  // elsewhere); a row known only from a local optimistic soft-delete isn't here, so a read that raced
  // ahead of that delete can't strand it.
  const trashConfirmed = useRef(new Set<string>())
  // Latest `byId`, for restore()'s membership guard: a stale Undo toast fires long after render, so its
  // closure can't read current state — the ref can. Written during render, not via an effect, so a
  // purge's removal is visible to an Undo click in the same frame.
  const byIdRef = useRef(byId)
  byIdRef.current = byId

  const kitchens = useMemo(
    () =>
      Object.values(byId)
        .filter((k) => !k.deleted_at)
        .sort(byCreatedThenId),
    [byId],
  )
  const trashed = useMemo(
    () =>
      Object.values(byId)
        .filter((k) => k.deleted_at)
        .sort(byDeletedAtDesc),
    [byId],
  )
  const deleted = trashed
  const trashCount = trashed.length

  // Kept as .then (not async/await): the set-state-in-effect lint rule traces setState in an async
  // body called from the effect, but not into a .then callback.
  const load = useCallback(() => {
    return listAllKitchens(supabase).then((data) => {
      if (data === null) {
        setStatus('error')
        return
      }
      // Trashed rows a server read reports are confirmed in the trash (except any mid-mutation), so a
      // later loadTrash that omits them may drop them.
      data.forEach((k) => {
        if (k.deleted_at && !pending.current.has(k.id)) trashConfirmed.current.add(k.id)
      })
      setById((prev) => {
        const next: ById = {}
        // Preserve in-flight optimistic rows the read may predate; take everything else from the server.
        for (const k of Object.values(prev)) if (pending.current.has(k.id)) next[k.id] = k
        for (const k of data) if (!pending.current.has(k.id)) next[k.id] = k
        return next
      })
      setStatus('ready')
      // The same read seeds the trash partition, so the panel opens without a load flash; a reopen
      // still refetches via loadTrash for cross-tab freshness.
      setTrashStatus('ready')
    })
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  const retry = () => {
    setStatus('loading')
    load()
  }

  const loadTrash = useCallback(() => {
    const seq = ++trashLoadSeq.current
    // A reopen refetches in the background: keep the already-loaded list visible rather than flashing
    // a loading/error screen. Only the first load — when there's nothing to show yet — surfaces those.
    setTrashStatus((s) => (s === 'ready' ? s : 'loading'))
    return listDeletedKitchens(supabase).then((data) => {
      if (seq !== trashLoadSeq.current) return // superseded by a newer open
      if (data === null) {
        setTrashStatus((s) => (s === 'ready' ? s : 'error'))
      } else {
        const dbIds = new Set(data.map((k) => k.id))
        // Confirm rows the read reports, except ids with a mutation in flight — re-confirming an
        // optimistic restore mid-flight would let the block below bounce it back to trash.
        data.forEach((k) => {
          if (!pending.current.has(k.id)) trashConfirmed.current.add(k.id)
        })
        setById((prev) => {
          const next = { ...prev }
          // Drop only previously-confirmed trashed rows this read omits (restored/purged elsewhere).
          // Skip in-flight ids and unconfirmed optimistic deletes so a read racing ahead of a local
          // mutation can neither strand a row nor clobber its optimistic state.
          for (const k of Object.values(next))
            if (
              k.deleted_at &&
              trashConfirmed.current.has(k.id) &&
              !dbIds.has(k.id) &&
              !pending.current.has(k.id)
            )
              delete next[k.id]
          for (const k of data) if (!pending.current.has(k.id)) next[k.id] = k
          return next
        })
        setTrashStatus('ready')
      }
    })
  }, [supabase])

  const create = async (name: string) => {
    const result = await createKitchen(supabase, name)
    if (result.ok) {
      setById((prev) => ({ ...prev, [result.kitchen.id]: result.kitchen }))
      return true
    }
    toast.error("Couldn't create the kitchen. Try again.")
    return false
  }

  const rename = async (id: string, name: string) => {
    if (name === byId[id]?.name) return true
    if (!(await renameKitchen(supabase, id, name))) {
      toast.error("Couldn't rename the kitchen. Try again.")
      return false
    }
    setById((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], name } } : prev))
    return true
  }

  // Declared before softDelete so the undo toast's onClick references an initialized binding.
  const restore = async (kitchen: Kitchen) => {
    if (pending.current.has(kitchen.id)) return
    // Not in the trash anymore (already restored/purged elsewhere): a stale Undo would roll live state
    // back. Read the ref, not `byId`, so a long-delayed toast sees current membership.
    if (!byIdRef.current[kitchen.id]?.deleted_at) return
    pending.current.add(kitchen.id)
    try {
      // Leaving trash: drop the confirmation so a racing read that still lists it (DB not yet updated)
      // can't strand a later re-delete of the same kitchen.
      trashConfirmed.current.delete(kitchen.id)
      setById((prev) => ({ ...prev, [kitchen.id]: { ...kitchen, deleted_at: null } }))
      if (!(await restoreKitchen(supabase, kitchen.id))) {
        setById((prev) => ({ ...prev, [kitchen.id]: kitchen }))
        toast.error(`Couldn't restore "${kitchenLabel(kitchen.name)}". Try again.`)
      }
    } finally {
      pending.current.delete(kitchen.id)
    }
  }

  const softDelete = async (kitchen: Kitchen) => {
    if (pending.current.has(kitchen.id)) return
    pending.current.add(kitchen.id)
    // Client timestamp so an already-open trash list shows "deleted now" without a refetch; replaced
    // with the DB's authoritative value once the RPC returns. Captured for the undo toast (not the live
    // `kitchen`) so a failed undo re-inserts the row with a timestamp.
    const trashed = { ...kitchen, deleted_at: new Date().toISOString() }
    try {
      setById((prev) => ({ ...prev, [kitchen.id]: trashed }))
      const row = await softDeleteKitchen(supabase, kitchen.id)
      if (!row) {
        setById((prev) => ({ ...prev, [kitchen.id]: { ...kitchen, deleted_at: null } }))
        toast.error(`Couldn't delete "${kitchenLabel(kitchen.name)}". Try again.`)
        return
      }
      // Reconcile the optimistic client stamp with the DB's authoritative deleted_at; keep the stamp
      // if the RPC didn't return one so the row stays trashed (membership is derived from deleted_at).
      setById((prev) => ({
        ...prev,
        [kitchen.id]: { ...trashed, deleted_at: row.deleted_at ?? trashed.deleted_at },
      }))
      toast('Kitchen moved to trash', {
        duration: 8000,
        action: { label: 'Undo', onClick: () => restore(trashed) },
      })
    } finally {
      pending.current.delete(kitchen.id)
    }
  }

  const purge = async (kitchen: Kitchen) => {
    if (pending.current.has(kitchen.id)) return
    pending.current.add(kitchen.id)
    try {
      trashConfirmed.current.delete(kitchen.id)
      setById((prev) => {
        const next = { ...prev }
        delete next[kitchen.id]
        return next
      })
      if (!(await purgeKitchen(supabase, kitchen.id))) {
        setById((prev) => ({ ...prev, [kitchen.id]: kitchen }))
        toast.error(
          `Couldn't permanently delete "${kitchenLabel(kitchen.name)}". It's still in your trash.`,
        )
      }
    } finally {
      pending.current.delete(kitchen.id)
    }
  }

  return {
    kitchens,
    status,
    retry,
    create,
    rename,
    softDelete,
    deleted,
    trashStatus,
    trashCount,
    loadTrash,
    restore,
    purge,
  }
}
