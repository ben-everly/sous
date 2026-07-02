import { LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Full-width form submit that owns the in-flight affordance (disabled + aria-busy + the
// spinning loader) so every form shows "pending" the same way.
export function SubmitButton({
  pending,
  disabled = false,
  children,
}: {
  pending: boolean
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} className="w-full">
      {pending && <LoaderCircle className="animate-spin" />}
      {children}
    </Button>
  )
}
