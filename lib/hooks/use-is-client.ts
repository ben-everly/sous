import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

// False during SSR and hydration, true after: unlike a mount effect, it never renders a stale first
// frame on later client-side mounts.
export function useIsClient() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}
