import { useSyncExternalStore } from 'react'
import { formatISO } from 'date-fns'

const snapshot = () => formatISO(new Date(), { representation: 'date' })

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 60_000)
  document.addEventListener('visibilitychange', onChange)
  return () => {
    clearInterval(id)
    document.removeEventListener('visibilitychange', onChange)
  }
}

export const useToday = (): string | null => useSyncExternalStore(subscribe, snapshot, () => null)
