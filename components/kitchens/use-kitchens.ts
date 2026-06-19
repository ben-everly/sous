'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { kitchenLabel } from '@/lib/kitchens/kitchen-label'
import {
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

export function useKitchens() {
  const [supabase] = useState(createClient)
  const [kitchens, setKitchens] = useState<Kitchen[]>([])
  const [status, setStatus] = useState<KitchensStatus>('loading')
  const [deleted, setDeleted] = useState<Kitchen[] | null>(null)
  const [trashStatus, setTrashStatus] = useState<TrashStatus>('idle')

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

  useEffect(() => {
    load()
  }, [load])

  const retry = () => {
    setStatus('loading')
    load()
  }

  const loadTrash = useCallback(() => {
    setTrashStatus('loading')
    return listDeletedKitchens(supabase).then((data) => {
      if (data === null) {
        setTrashStatus('error')
      } else {
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

  // Declared before softDelete so the undo toast's onClick references an initialized binding.
  const restore = async (kitchen: Kitchen) => {
    // Snapshot-by-value rollback (here and in softDelete/purge) is deliberate: a functional updater
    // can't rebuild the prior array on failure. Safe for the single-user UI, where mutations don't overlap.
    const prevDeleted = deleted
    setDeleted((d) => (d === null ? d : d.filter((k) => k.id !== kitchen.id)))
    setKitchens((ks) =>
      ks.some((k) => k.id === kitchen.id)
        ? ks
        : [...ks, { ...kitchen, deleted_at: null }].sort(byCreatedThenId),
    )
    if (!(await restoreKitchen(supabase, kitchen.id))) {
      setKitchens((ks) => ks.filter((k) => k.id !== kitchen.id))
      setDeleted(prevDeleted)
      toast.error(`Couldn't restore "${kitchenLabel(kitchen.name)}". Try again.`)
    }
  }

  const softDelete = async (kitchen: Kitchen) => {
    const prevLive = kitchens
    setKitchens((ks) => ks.filter((k) => k.id !== kitchen.id))
    // Stamp deleted_at so an already-open trash list shows "deleted now" without a refetch.
    const trashed = { ...kitchen, deleted_at: new Date().toISOString() }
    setDeleted((d) => (d === null ? d : [trashed, ...d]))
    if (!(await softDeleteKitchen(supabase, kitchen.id))) {
      setKitchens(prevLive)
      setDeleted((d) => (d === null ? d : d.filter((k) => k.id !== kitchen.id)))
      toast.error(`Couldn't delete "${kitchenLabel(kitchen.name)}". Try again.`)
      return
    }
    toast('Kitchen moved to trash', {
      duration: 8000,
      action: { label: 'Undo', onClick: () => restore(kitchen) },
    })
  }

  const purge = async (kitchen: Kitchen) => {
    const prevDeleted = deleted
    setDeleted((d) => (d === null ? d : d.filter((k) => k.id !== kitchen.id)))
    if (!(await purgeKitchen(supabase, kitchen.id))) {
      setDeleted(prevDeleted)
      toast.error(`Couldn't delete "${kitchenLabel(kitchen.name)}". Try again.`)
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
    loadTrash,
    restore,
    purge,
  }
}
