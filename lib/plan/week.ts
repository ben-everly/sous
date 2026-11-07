import { addDays, formatISO, isValid, parseISO, startOfWeek, type Day } from 'date-fns'
import type { Database } from '@/types/database.types'

export type MealType = Database['public']['Enums']['meal_type']

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const satisfies readonly MealType[]

export const MAX_RECIPES_PER_MEAL = 20

type WeekInfo = { firstDay: number }

// weekInfo counts Monday 1 … Sunday 7; Day counts Sunday 0 … Saturday 6.
const firstDayOfWeek = (): Day => {
  const l = new Intl.Locale(new Intl.DateTimeFormat().resolvedOptions().locale) as Intl.Locale & {
    getWeekInfo?: () => WeekInfo
    weekInfo?: WeekInfo
  }
  return (((l.getWeekInfo?.() ?? l.weekInfo)?.firstDay ?? 7) % 7) as Day
}

export const weekOf = (today: Date, firstDay: Day = firstDayOfWeek()) => {
  const start = startOfWeek(today, { weekStartsOn: firstDay })
  return Array.from({ length: 7 }, (_, i) =>
    formatISO(addDays(start, i), { representation: 'date' }),
  )
}

const shortWeekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const longWeekday = new Intl.DateTimeFormat(undefined, { weekday: 'long' })
const monthDay = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const fullDay = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

export const dayLabel = (date: string) => {
  const d = parseISO(date)
  return { weekday: shortWeekday.format(d), day: d.getDate(), full: fullDay.format(d) }
}

const monthDayYear = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

export const weekRange = (dates: string[], today: string) => {
  const [a, b] = [dates[0], dates.at(-1)!].map((d) => parseISO(d))
  const year = parseISO(today).getFullYear()
  return (
    a.getFullYear() === year && b.getFullYear() === year ? monthDay : monthDayYear
  ).formatRange(a, b)
}

export const weekdayName = (date: string) => longWeekday.format(parseISO(date))

const inRange = (start: Date) => start.getFullYear() >= 1 && addDays(start, 6).getFullYear() <= 9999

const iso = (d: Date) => formatISO(d, { representation: 'date' })

export const parseWeek = (param: string | null) => {
  const d = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? parseISO(param) : null
  return d && isValid(d) && iso(d) === param && inRange(d) ? param : null
}

export const weekFrom = (start: string) =>
  Array.from({ length: 7 }, (_, i) => iso(addDays(parseISO(start), i)))

export const shiftWeek = (start: string, weeks: number) => {
  const d = addDays(parseISO(start), weeks * 7)
  return inRange(d) ? iso(d) : null
}

const HEADINGS = [
  [0, 'This week'],
  [1, 'Next week'],
  [-1, 'Last week'],
] as const

export const weekHeading = (start: string, today: string, firstDay?: Day) => {
  const base = weekOf(parseISO(today), firstDay)[0]
  return HEADINGS.find(([n]) => shiftWeek(base, n) === start)?.[1] ?? null
}
