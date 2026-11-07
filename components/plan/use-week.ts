'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { parseISO } from 'date-fns'
import { parseWeek, weekFrom, weekOf } from '@/lib/plan/week'

const url = (params: URLSearchParams, start: string) => {
  const next = new URLSearchParams(params)
  next.set('week', start)
  return `?${next}`
}

export function useWeek(today: string) {
  const params = useSearchParams()
  const param = params.get('week')
  const start = parseWeek(param) ?? weekOf(parseISO(today))[0]

  useEffect(() => {
    if (param !== start) window.history.replaceState(null, '', url(params, start))
  }, [param, start, params])

  return {
    start,
    dates: weekFrom(start),
    go: (to: string) => window.history.pushState(null, '', url(params, to)),
  }
}
