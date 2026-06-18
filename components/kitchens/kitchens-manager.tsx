'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { kitchenLabel } from '@/lib/kitchens/kitchen-label'
import { listKitchens, createKitchen, renameKitchen, deleteKitchen } from '@/lib/kitchens/queries'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { KitchenRow } from './kitchen-row'
import { KitchenNameForm } from './kitchen-name-form'
import type { Kitchen } from '@/lib/kitchens/types'

export function KitchensManager() {
  const [supabase] = useState(createClient)
  const [kitchens, setKitchens] = useState<Kitchen[]>([])
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftOpen, setDraftOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Kitchen | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    setStatus('loading')
    // RLS scopes the read to the owner; no client-side owner filter needed.
    listKitchens(supabase).then((data) => {
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

  if (status === 'error') {
    return (
      <div className="mt-6 space-y-3 rounded-md border border-dashed p-6 text-center">
        <p className="text-muted-foreground text-sm">Could not load your kitchens.</p>
        <Button onClick={load}>Try again</Button>
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <ul
        className="mt-6 divide-y rounded-md border"
        aria-busy="true"
        aria-label="Loading kitchens"
      >
        <li aria-hidden className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="bg-muted h-4 w-40 animate-pulse rounded" />
          <div className="flex items-center gap-1">
            <div className="bg-muted size-8 animate-pulse rounded" />
            <div className="bg-muted size-8 animate-pulse rounded" />
          </div>
        </li>
      </ul>
    )
  }

  const hasDefault = kitchens.some((k) => k.name === null)

  const create = async (name: string) => {
    const result = await createKitchen(supabase, name)
    if (result.ok) {
      setKitchens((ks) => [...ks, result.kitchen])
      setDraftOpen(false)
      return true
    }
    if (result.reason === 'duplicate-default') {
      toast.error('You already have a default kitchen. Give this one a name.')
      load()
    } else {
      toast.error("Couldn't create the kitchen. Try again.")
    }
    return false
  }

  const rename = async (id: string, name: string) => {
    // The inline editor masks the row, so an optimistic write would be invisible — just await.
    if (name === kitchens.find((k) => k.id === id)?.name) {
      setEditingId(null)
      return true
    }
    if (!(await renameKitchen(supabase, id, name))) {
      toast.error("Couldn't rename the kitchen. Try again.")
      return false
    }
    setKitchens((ks) => ks.map((k) => (k.id === id ? { ...k, name } : k)))
    setEditingId(null)
    return true
  }

  const remove = async (kitchen: Kitchen) => {
    if (deleting) return
    setDeleting(true)
    const prev = kitchens
    setKitchens((ks) => ks.filter((k) => k.id !== kitchen.id))
    setPendingDelete(null)
    try {
      if (!(await deleteKitchen(supabase, kitchen.id))) {
        setKitchens(prev)
        toast.error(`Couldn't delete "${kitchenLabel(kitchen.name)}". Try again.`)
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {kitchens.length === 0 && !draftOpen ? (
        <div className="space-y-3 rounded-md border border-dashed p-6 text-center">
          <p className="text-muted-foreground text-sm">You have no kitchens yet.</p>
          <Button onClick={() => setDraftOpen(true)}>
            <Plus /> Add kitchen
          </Button>
        </div>
      ) : (
        <>
          <ul className="divide-y rounded-md border">
            {kitchens.map((k) => (
              <KitchenRow
                key={k.id}
                kitchen={k}
                isEditing={editingId === k.id}
                onEdit={() => setEditingId(k.id)}
                onCancelEdit={() => setEditingId(null)}
                onRename={(name) => rename(k.id, name)}
                onRequestDelete={() => setPendingDelete(k)}
              />
            ))}
            {draftOpen && (
              <li className="flex items-center justify-between gap-3 px-4 py-3">
                <KitchenNameForm
                  initialValue=""
                  inputLabel="New kitchen name"
                  submitLabel="Add"
                  optional={!hasDefault}
                  placeholder={hasDefault ? 'Name your kitchen' : kitchenLabel(null)}
                  onSubmit={create}
                  onCancel={() => setDraftOpen(false)}
                />
              </li>
            )}
          </ul>

          {!draftOpen && (
            <Button onClick={() => setDraftOpen(true)}>
              <Plus /> Add kitchen
            </Button>
          )}
        </>
      )}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete kitchen?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes {pendingDelete && kitchenLabel(pendingDelete.name)} and
              everything in it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              aria-busy={deleting}
              onClick={() => pendingDelete && remove(pendingDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
