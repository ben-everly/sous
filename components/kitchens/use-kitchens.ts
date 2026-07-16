'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  encode,
  useDeleteItem,
  useInsertMutation,
  useQuery,
  useUpdateMutation,
  useUpsertItem,
} from '@supabase-cache-helpers/postgrest-react-query'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
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

export function useKitchens() {
  const [supabase] = useState(createClient)
  const queryClient = useQueryClient()

  const query = useQuery(allKitchensQuery(supabase), {
    // The single read is the source of truth; mutations patch it optimistically by PK and reconcile on
    // settle, so a background refetch must never silently clobber an in-flight optimistic row.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
  const queryKey = useMemo(() => encode(allKitchensQuery(supabase), false), [supabase])

  const rows = useMemo(() => (query.data ?? []) as Kitchen[], [query.data])

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

  // Invalidation forces a refetch even under staleTime: Infinity, reconciling the list to server truth.
  const loadTrash = useCallback(
    () => queryClient.invalidateQueries({ queryKey }),
    [queryClient, queryKey],
  )

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
    if (name === rows.find((k) => k.id === id)?.name) return true
    try {
      // useUpdateMutation's fetcher is .single(), so a 0-row match (RLS-filtered / stale id) rejects.
      await update.mutateAsync({ id, name })
      return true
    } catch {
      toast.error("Couldn't rename the kitchen. Try again.")
      return false
    }
  }

  const restoreMutation = useMutation({
    mutationFn: (kitchen: Kitchen) => restoreKitchen(supabase, kitchen.id),
    onMutate: async (kitchen: Kitchen) => {
      await queryClient.cancelQueries({ queryKey })
      const prev = queryClient.getQueryData(queryKey)
      await upsertItem({ ...kitchen, deleted_at: null })
      return { prev }
    },
    onError: (_e, kitchen, ctx) => {
      queryClient.setQueryData(queryKey, ctx?.prev)
      toast.error(`Couldn't restore "${kitchenLabel(kitchen.name)}". Try again.`)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })
  const restore = (kitchen: Kitchen) => restoreMutation.mutate(kitchen)

  const softDeleteMutation = useMutation({
    mutationFn: (kitchen: Kitchen) => softDeleteKitchen(supabase, kitchen.id),
    onMutate: async (kitchen: Kitchen) => {
      await queryClient.cancelQueries({ queryKey })
      const prev = queryClient.getQueryData(queryKey)
      // Client stamp so an open trash list shows "deleted now" without waiting for the settle refetch,
      // which replaces it with the DB's authoritative deleted_at. Carried to onSuccess so the undo
      // toast restores a row that still reads as trashed if the undo itself fails.
      const trashed = { ...kitchen, deleted_at: new Date().toISOString() }
      await upsertItem(trashed)
      return { prev, trashed }
    },
    onSuccess: (_data, _kitchen, ctx) =>
      toast('Kitchen moved to trash', {
        duration: 8000,
        action: { label: 'Undo', onClick: () => restore(ctx.trashed) },
      }),
    onError: (_e, kitchen, ctx) => {
      queryClient.setQueryData(queryKey, ctx?.prev)
      toast.error(`Couldn't delete "${kitchenLabel(kitchen.name)}". Try again.`)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })
  const softDelete = (kitchen: Kitchen) => softDeleteMutation.mutate(kitchen)

  const purgeMutation = useMutation({
    mutationFn: (kitchen: Kitchen) => purgeKitchen(supabase, kitchen.id),
    onMutate: async (kitchen: Kitchen) => {
      await queryClient.cancelQueries({ queryKey })
      const prev = queryClient.getQueryData(queryKey)
      await deleteItem(kitchen)
      return { prev }
    },
    onError: (_e, kitchen, ctx) => {
      queryClient.setQueryData(queryKey, ctx?.prev)
      toast.error(`Couldn't permanently delete "${kitchenLabel(kitchen.name)}". Try again.`)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })
  const purge = (kitchen: Kitchen) => purgeMutation.mutate(kitchen)

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
