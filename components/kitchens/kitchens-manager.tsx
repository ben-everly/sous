'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { kitchenLabel } from '@/lib/kitchens/kitchen-label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Kitchen = { id: string; name: string | null; created_at: string }

const NAME_MAX = 200

export function KitchensManager({
  ownerId,
  ownerDisplayName,
}: {
  ownerId: string
  ownerDisplayName: string | null
}) {
  const [supabase] = useState(createClient)
  const [kitchens, setKitchens] = useState<Kitchen[] | null>(null) // null = loading
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Kitchen | null>(null)
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    // RLS scopes the read to the owner; no client-side owner filter needed.
    supabase
      .from('kitchens')
      .select('id, name, created_at')
      .order('created_at')
      .then(({ data, error }) => {
        if (error) {
          toast.error('Could not load your kitchens.')
          setKitchens([])
          return
        }
        setKitchens(data)
      })
  }, [supabase])

  if (kitchens === null) {
    return <p className="text-muted-foreground mt-6 text-sm">Loading…</p>
  }

  const create = async () => {
    // Zero kitchens → insert nameless (the bootstrap/recovery path, no name input shown).
    // Otherwise a non-empty name is required — always a subset of what the DB index permits.
    const isFirst = kitchens.length === 0
    let name: string | null = null
    if (!isFirst) {
      name = newName.trim()
      if (name === '') return
    }
    if (creating) return
    setCreating(true)
    try {
      const { data, error } = await supabase
        .from('kitchens')
        .insert({ owner_id: ownerId, name })
        .select('id, name, created_at')
        .single()
      if (error || !data) {
        toast.error('Could not create the kitchen.')
        return
      }
      setKitchens((ks) => [...(ks ?? []), data])
      setNewName('')
    } finally {
      setCreating(false)
    }
  }

  const rename = async (id: string) => {
    const name = editName.trim()
    if (name === '' || renaming) return
    setRenaming(true)
    const prev = kitchens
    setKitchens((ks) => (ks ?? []).map((k) => (k.id === id ? { ...k, name } : k)))
    setEditingId(null)
    try {
      const { error } = await supabase.from('kitchens').update({ name }).eq('id', id)
      if (error) {
        setKitchens(prev)
        toast.error('Could not rename the kitchen.')
      }
    } finally {
      setRenaming(false)
    }
  }

  const remove = async (kitchen: Kitchen) => {
    if (deleting) return
    setDeleting(true)
    const prev = kitchens
    setKitchens((ks) => (ks ?? []).filter((k) => k.id !== kitchen.id))
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
          <Button onClick={create} disabled={creating}>
            <Plus /> Create a kitchen
          </Button>
        </div>
      ) : (
        <>
          <ul className="divide-y rounded-md border">
            {kitchens.map((k) => {
              const label = kitchenLabel(k.name, ownerDisplayName)
              return (
                <li key={k.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  {editingId === k.id ? (
                    <form
                      className="flex flex-1 items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault()
                        rename(k.id)
                      }}
                    >
                      <Input
                        autoFocus
                        value={editName}
                        maxLength={NAME_MAX}
                        aria-label="Kitchen name"
                        onChange={(e) => setEditName(e.target.value)}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={editName.trim() === '' || renaming}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </form>
                  ) : (
                    <>
                      <span className="text-sm font-medium">{label}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Rename ${label}`}
                          onClick={() => {
                            setEditingId(k.id)
                            setEditName(k.name ?? '')
                          }}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Delete ${label}`}
                          onClick={() => setPendingDelete(k)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </>
                  )}
                </li>
              )
            })}
          </ul>

          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              create()
            }}
          >
            <Input
              value={newName}
              maxLength={NAME_MAX}
              placeholder="New kitchen name"
              aria-label="New kitchen name"
              onChange={(e) => setNewName(e.target.value)}
            />
            <Button type="submit" disabled={creating || newName.trim() === ''}>
              <Plus /> Add kitchen
            </Button>
          </form>
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
            <Button disabled={deleting} onClick={() => pendingDelete && remove(pendingDelete)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
