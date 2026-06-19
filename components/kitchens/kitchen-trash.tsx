'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { kitchenLabel } from '@/lib/kitchens/kitchen-label'
import { relativeTime } from '@/lib/kitchens/relative-time'
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
import type { TrashStatus } from './use-kitchens'

export function KitchenTrash({
  deleted,
  status,
  onLoad,
  onRestore,
  onPurge,
}: {
  deleted: Kitchen[] | null
  status: TrashStatus
  onLoad: () => void
  onRestore: (kitchen: Kitchen) => void
  onPurge: (kitchen: Kitchen) => void
}) {
  const [open, setOpen] = useState(false)
  const [pendingPurge, setPendingPurge] = useState<Kitchen | null>(null)

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && status === 'idle') onLoad()
  }

  return (
    <section className="space-y-3">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
      >
        <ChevronRight className={`transition-transform ${open ? 'rotate-90' : ''}`} />
        Recently deleted
      </button>

      {open && (
        <>
          {status === 'loading' && <p className="text-muted-foreground text-sm">Loading…</p>}
          {status === 'error' && (
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">Could not load deleted kitchens.</p>
              <Button size="sm" onClick={onLoad}>
                Try again
              </Button>
            </div>
          )}
          {status === 'ready' && deleted?.length === 0 && (
            <p className="text-muted-foreground text-sm">Trash is empty.</p>
          )}
          {status === 'ready' && deleted && deleted.length > 0 && (
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
        </>
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
