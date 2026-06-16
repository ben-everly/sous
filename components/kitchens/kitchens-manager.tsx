'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { kitchenLabel } from '@/lib/kitchens/kitchen-label'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { KitchenRow } from './kitchen-row'
import { KitchenNameForm } from './kitchen-name-form'
import type { Kitchen } from './types'

export function KitchensManager({ ownerDisplayName }: { ownerDisplayName: string | null }) {
  const [supabase] = useState(createClient)
  const [kitchens, setKitchens] = useState<Kitchen[]>([])
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftOpen, setDraftOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Kitchen | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(false)

  const load = useCallback(() => {
    setStatus('loading')
    // RLS scopes the read to the owner; no client-side owner filter needed.
    supabase
      .from('kitchens')
      .select('id, name, created_at')
      .order('created_at')
      .then(({ data, error }) => {
        if (error || !data) {
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

  const insert = async (name: string | null) => {
    const { data, error } = await supabase
      .from('kitchens')
      .insert({ name })
      .select('id, name, created_at')
      .single()
    if (error || !data) {
      // 23505 = the one-unnamed-kitchen unique index; a concurrent insert already won, so reconcile.
      if (error?.code === '23505') {
        load()
        return true
      }
      toast.error('Could not create the kitchen.')
      return false
    }
    setKitchens((ks) => [...ks, data])
    return true
  }

  // Empty-state recovery: a user who deleted down to zero re-bootstraps a nameless kitchen
  // (the same default the signup trigger creates). Named adds go through the draft row.
  const bootstrap = async () => {
    if (bootstrapping) return
    setBootstrapping(true)
    try {
      await insert(null)
    } finally {
      setBootstrapping(false)
    }
  }

  const createNamed = async (name: string) => {
    const ok = await insert(name)
    if (ok) setDraftOpen(false)
    return ok
  }

  const rename = async (id: string, name: string) => {
    // The inline editor masks the row, so an optimistic write would be invisible — just await.
    if (name === kitchens.find((k) => k.id === id)?.name) {
      setEditingId(null)
      return true
    }
    const { error } = await supabase.from('kitchens').update({ name }).eq('id', id)
    if (error) {
      toast.error('Could not rename the kitchen.')
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
      const { error } = await supabase.from('kitchens').delete().eq('id', kitchen.id)
      if (error) {
        setKitchens(prev)
        toast.error('Could not delete the kitchen.')
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {kitchens.length === 0 ? (
        <div className="space-y-3 rounded-md border border-dashed p-6 text-center">
          <p className="text-muted-foreground text-sm">You have no kitchens yet.</p>
          <Button onClick={bootstrap} disabled={bootstrapping} aria-busy={bootstrapping}>
            <Plus /> Create a kitchen
          </Button>
        </div>
      ) : (
        <>
          <ul className="divide-y rounded-md border">
            {kitchens.map((k) => (
              <KitchenRow
                key={k.id}
                kitchen={k}
                ownerDisplayName={ownerDisplayName}
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
                  onSubmit={createNamed}
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

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete kitchen?</DialogTitle>
            <DialogDescription>
              This permanently deletes{' '}
              {pendingDelete && kitchenLabel(pendingDelete.name, ownerDisplayName)} and everything
              in it. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              disabled={deleting}
              aria-busy={deleting}
              onClick={() => pendingDelete && remove(pendingDelete)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
