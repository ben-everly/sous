'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { kitchenLabel } from '@/lib/kitchens/kitchen-label'
import {
  countDeletedKitchens,
  createKitchen,
  listDeletedKitchens,
  listKitchens,
  purgeKitchen,
  renameKitchen,
  restoreKitchen,
  softDeleteKitchen,
} from '@/lib/kitchens/queries'
import type { Kitchen } from '@/lib/kitchens/types'

export type KitchensStatus = 'loading' | 'error' | 'ready'
export type TrashStatus = 'idle' | 'loading' | 'error' | 'ready'

// Mirrors the DB list order (created_at asc, id tiebreak) so a restored kitchen lands back in its
// original slot rather than at the end of the list.
const byCreatedThenId = (a: Kitchen, b: Kitchen) =>
  a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)

// Trash order: most-recently-deleted first, id tiebreak for a total order.
const byDeletedAtDesc = (a: Kitchen, b: Kitchen) =>
  (b.deleted_at ?? '').localeCompare(a.deleted_at ?? '') || a.id.localeCompare(b.id)

// Idempotent sorted insert: skip if already present so an out-of-order rollback can't duplicate a row.
const insertSorted = (list: Kitchen[], item: Kitchen, cmp: (a: Kitchen, b: Kitchen) => number) =>
  list.some((k) => k.id === item.id) ? list : [...list, item].sort(cmp)

export function useKitchens() {
  const [supabase] = useState(createClient)
  const [kitchens, setKitchens] = useState<Kitchen[]>([])
  const [status, setStatus] = useState<KitchensStatus>('loading')
  const [deleted, setDeleted] = useState<Kitchen[] | null>(null)
  const [trashStatus, setTrashStatus] = useState<TrashStatus>('idle')
  // Collapsed-badge count, used ONLY before the panel opens (deleted === null); once loadTrash
  // populates `deleted`, the returned trashCount derives from deleted.length instead. null = not yet
  // known (mount count pending/failed); deltas fall back to a 0 baseline so a soft-delete still
  // surfaces a badge.
  const [unopenedTrashCount, setUnopenedTrashCount] = useState<number | null>(null)
  // Ids with a mutation in flight. A second delete/restore/purge of the same kitchen would hit the
  // RPC's deleted_at-guard no-op (null → "failure") and roll back the first call's success, so drop it.
  const pending = useRef(new Set<string>())
  // Ids the client believes are in the trash. restore() guards on this so a stale Undo toast — fired
  // after the kitchen was already restored or purged via the trash panel — is a no-op instead of
  // rolling live state back on the RPC's null (already-in-target-state) result. loadTrash merges the
  // DB's ids in rather than resetting, so an in-flight soft-delete the read hasn't observed isn't dropped.
  const trashedIds = useRef(new Set<string>())
  // Bumped per loadTrash; a fetch applies only if it's still the latest, so overlapping reopens can't
  // resolve out of order and paint stale trash.
  const trashLoadSeq = useRef(0)

  // Kept as .then (not async/await): the set-state-in-effect lint rule traces setState in an async
  // body called from the effect, but not into a .then callback.
  const load = useCallback(() => {
    return listKitchens(supabase).then((data) => {
      if (data === null) {
        setStatus('error')
      } else {
        setKitchens(data)
        setStatus('ready')
      }
    })
  }, [supabase])

  // Closed-panel only (open → trashCount derives from deleted.length). No clamp: while closed a
  // restore only ever follows a soft-delete, so the count can't go negative.
  const bumpUnopenedCount = (by: number) => {
    if (deleted !== null) return
    setUnopenedTrashCount((c) => (c ?? 0) + by)
  }

  useEffect(() => {
    load()
    // Eager count for the disclosure badge. Only seeds the baseline if no optimistic delta has set it
    // yet; once the panel opens the count derives from the loaded list instead.
    countDeletedKitchens(supabase).then((n) => setUnopenedTrashCount((c) => (c === null ? n : c)))
  }, [load, supabase])

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
        data.forEach((k) => trashedIds.current.add(k.id))
        setDeleted(data)
        setTrashStatus('ready')
      }
    })
  }, [supabase])

  const create = async (name: string) => {
    const result = await createKitchen(supabase, name)
    if (result.ok) {
      setKitchens((ks) => [...ks, result.kitchen])
      return true
    }
    toast.error("Couldn't create the kitchen. Try again.")
    return false
  }

  const rename = async (id: string, name: string) => {
    if (name === kitchens.find((k) => k.id === id)?.name) return true
    if (!(await renameKitchen(supabase, id, name))) {
      toast.error("Couldn't rename the kitchen. Try again.")
      return false
    }
    setKitchens((ks) => ks.map((k) => (k.id === id ? { ...k, name } : k)))
    return true
  }

  // Rollback (here and in softDelete/purge) re-inserts/removes only the affected row via functional
  // updaters, not a by-value array snapshot, so a failed mutation can't clobber a different in-flight
  // row; the `pending` guard covers same-row overlap.
  // Declared before softDelete so the undo toast's onClick references an initialized binding.
  const restore = async (kitchen: Kitchen) => {
    if (pending.current.has(kitchen.id)) return
    // Not in the trash (already restored/purged elsewhere): a stale Undo would roll live state back.
    if (!trashedIds.current.has(kitchen.id)) return
    pending.current.add(kitchen.id)
    try {
      trashedIds.current.delete(kitchen.id)
      bumpUnopenedCount(-1)
      setDeleted((d) => (d === null ? d : d.filter((k) => k.id !== kitchen.id)))
      setKitchens((ks) => insertSorted(ks, { ...kitchen, deleted_at: null }, byCreatedThenId))
      if (!(await restoreKitchen(supabase, kitchen.id))) {
        trashedIds.current.add(kitchen.id)
        bumpUnopenedCount(1)
        setKitchens((ks) => ks.filter((k) => k.id !== kitchen.id))
        setDeleted((d) => (d === null ? d : insertSorted(d, kitchen, byDeletedAtDesc)))
        toast.error(`Couldn't restore "${kitchenLabel(kitchen.name)}". Try again.`)
      }
    } finally {
      pending.current.delete(kitchen.id)
    }
  }

  const softDelete = async (kitchen: Kitchen) => {
    if (pending.current.has(kitchen.id)) return
    pending.current.add(kitchen.id)
    // Stamp deleted_at so an already-open trash list shows "deleted now" without a refetch. Passed to
    // the undo toast (not the live `kitchen`) so a failed undo re-inserts the row with its timestamp.
    const trashed = { ...kitchen, deleted_at: new Date().toISOString() }
    try {
      trashedIds.current.add(kitchen.id)
      bumpUnopenedCount(1)
      setKitchens((ks) => ks.filter((k) => k.id !== kitchen.id))
      setDeleted((d) => (d === null ? d : insertSorted(d, trashed, byDeletedAtDesc)))
      const row = await softDeleteKitchen(supabase, kitchen.id)
      if (!row) {
        trashedIds.current.delete(kitchen.id)
        bumpUnopenedCount(-1)
        setKitchens((ks) => insertSorted(ks, kitchen, byCreatedThenId))
        setDeleted((d) => (d === null ? d : d.filter((k) => k.id !== kitchen.id)))
        toast.error(`Couldn't delete "${kitchenLabel(kitchen.name)}". Try again.`)
        return
      }
      // Replace the optimistic client stamp with the DB's authoritative deleted_at.
      setDeleted((d) =>
        d === null ? d : d.map((k) => (k.id === row.id ? { ...k, deleted_at: row.deleted_at } : k)),
      )
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
      trashedIds.current.delete(kitchen.id)
      bumpUnopenedCount(-1)
      setDeleted((d) => (d === null ? d : d.filter((k) => k.id !== kitchen.id)))
      if (!(await purgeKitchen(supabase, kitchen.id))) {
        trashedIds.current.add(kitchen.id)
        bumpUnopenedCount(1)
        setDeleted((d) => (d === null ? d : insertSorted(d, kitchen, byDeletedAtDesc)))
        toast.error(
          `Couldn't permanently delete "${kitchenLabel(kitchen.name)}". It's still in your trash.`,
        )
      }
    } finally {
      pending.current.delete(kitchen.id)
    }
  }

  const trashCount = deleted !== null ? deleted.length : unopenedTrashCount

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
