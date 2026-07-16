'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { kitchenLabel } from '@/lib/kitchens/kitchen-label'
import { relativeTime } from '@/lib/kitchens/relative-time'
import { cn } from '@/lib/utils'
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
import type { Kitchen } from '@/lib/kitchens/types'

export function KitchenTrash({
  deleted,
  onLoad,
  onRestore,
  onPurge,
}: {
  deleted: Kitchen[]
  onLoad: () => void
  onRestore: (kitchen: Kitchen) => void
  onPurge: (kitchen: Kitchen) => void
}) {
  const [open, setOpen] = useState(false)
  const [pendingPurge, setPendingPurge] = useState<Kitchen | null>(null)

  const toggle = () => {
    const next = !open
    setOpen(next)
    // Refetch on every open so a reopen reflects restores/purges from another tab and fresh timestamps.
    if (next) onLoad()
  }

  const hasItems = deleted.length > 0

  return (
    <section className="space-y-3">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="kitchen-trash-panel"
        className={cn(
          'hover:text-foreground flex items-center gap-1 text-sm',
          hasItems ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        <ChevronRight aria-hidden className={`transition-transform ${open ? 'rotate-90' : ''}`} />
        {hasItems ? `Trash (${deleted.length})` : 'Trash'}
      </button>

      {open && (
        <div id="kitchen-trash-panel" className="space-y-3">
          {deleted.length === 0 && (
            <p role="status" className="text-muted-foreground text-sm">
              Trash is empty.
            </p>
          )}
          {deleted.length > 0 && (
            <ul className="divide-y rounded-md border">
              {deleted.map((k) => {
                const label = kitchenLabel(k.name)
                return (
                  <li key={k.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{label}</span>
                      <span className="text-muted-foreground text-xs">
                        deleted {k.deleted_at ? relativeTime(k.deleted_at) : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Restore ${label}`}
                        onClick={() => onRestore(k)}
                      >
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Delete ${label} permanently`}
                        onClick={() => setPendingPurge(k)}
                      >
                        Delete permanently
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      <AlertDialog open={pendingPurge !== null} onOpenChange={(o) => !o && setPendingPurge(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete kitchen?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes {pendingPurge && kitchenLabel(pendingPurge.name)}. This
              can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingPurge) onPurge(pendingPurge)
                setPendingPurge(null)
              }}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
