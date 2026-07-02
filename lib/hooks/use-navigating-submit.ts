import { useState } from 'react'

// One-way by design: the spinner must outlive the redirect, so there is no reset.
// `navigating` dies with the component when the new page mounts.
export function useNavigatingSubmit(isSubmitting: boolean) {
  const [navigating, setNavigating] = useState(false)
  return { pending: isSubmitting || navigating, startNavigating: () => setNavigating(true) }
}
