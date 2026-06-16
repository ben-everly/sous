'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { kitchenLabel } from '@/lib/kitchens/kitchen-label'
import { Button } from '@/components/ui/button'
import { KitchenNameForm } from './kitchen-name-form'
import type { Kitchen } from './types'

export function KitchenRow({
  kitchen,
  isEditing,
  onEdit,
  onCancelEdit,
  onRename,
  onRequestDelete,
}: {
  kitchen: Kitchen
  isEditing: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onRename: (name: string) => Promise<boolean>
  onRequestDelete: () => void
}) {
  const label = kitchenLabel(kitchen.name)

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      {isEditing ? (
        <KitchenNameForm
          initialValue={kitchen.name ?? ''}
          inputLabel="Kitchen name"
          submitLabel="Save"
          onSubmit={onRename}
          onCancel={onCancelEdit}
        />
      ) : (
        <>
          <span className="text-sm font-medium">{label}</span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" aria-label={`Rename ${label}`} onClick={onEdit}>
              <Pencil />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Delete ${label}`}
              onClick={onRequestDelete}
            >
              <Trash2 />
            </Button>
          </div>
        </>
      )}
    </li>
  )
}
