import { LoaderCircle } from 'lucide-react'

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
