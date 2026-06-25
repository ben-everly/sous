import { LoaderCircle } from 'lucide-react'

// Centered status spinner with optional copy. `role="status"` announces the wait to
// assistive tech. Used for Suspense fallbacks and in-flight verification states.
export function Spinner({ label }: { label?: string }) {
  return (
    <p
      role="status"
      className="text-muted-foreground flex items-center justify-center gap-2 text-sm"
    >
      <LoaderCircle className="animate-spin" />
      {label}
    </p>
  )
}
