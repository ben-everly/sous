'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useKitchens } from './use-kitchens'
import { Button } from '@/components/ui/button'
import { KitchenRow } from './kitchen-row'
import { KitchenNameForm } from './kitchen-name-form'
import { KitchenTrash } from './kitchen-trash'

export function KitchensManager() {
  const { kitchens, status, retry, create, rename, softDelete, deleted, refresh, restore, purge } =
    useKitchens()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftOpen, setDraftOpen] = useState(false)

  if (status === 'error') {
    return (
      <div className="mt-6 space-y-3 rounded-md border border-dashed p-6 text-center">
        <p className="text-muted-foreground text-sm">Could not load your kitchens.</p>
        <Button onClick={retry}>Try again</Button>
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
                onRename={async (name) => {
                  const ok = await rename(k.id, name)
                  if (ok) setEditingId(null)
                  return ok
                }}
                onRequestDelete={() => softDelete(k)}
              />
            ))}
            {draftOpen && (
              <li className="flex items-center justify-between gap-3 px-4 py-3">
                <KitchenNameForm
                  initialValue=""
                  inputLabel="New kitchen name"
                  submitLabel="Add"
                  placeholder="Name your kitchen"
                  onSubmit={async (name) => {
                    const ok = await create(name)
                    if (ok) setDraftOpen(false)
                    return ok
                  }}
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

      <KitchenTrash deleted={deleted} onLoad={refresh} onRestore={restore} onPurge={purge} />
    </div>
  )
}
