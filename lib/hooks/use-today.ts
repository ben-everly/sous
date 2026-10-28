import { useEffect, useState } from 'react'
import { formatISO } from 'date-fns'

export function useToday() {
  const [today, setToday] = useState(() => formatISO(new Date(), { representation: 'date' }))
  useEffect(() => {
    const check = () => setToday(formatISO(new Date(), { representation: 'date' }))
    const id = setInterval(check, 60_000)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])
  return today
}
