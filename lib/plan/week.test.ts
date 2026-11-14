import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  dayLabel,
  parseWeek,
  shiftWeek,
  weekHeading,
  weekDates,
  weekRange,
  weekStart,
} from './week'

afterEach(() => vi.restoreAllMocks())

describe('week helpers', () => {
  it.each([11, 12, 13, 14, 15, 16, 17])('a Sunday-first week of Oct %i starts on Oct 11', (day) =>
    expect(weekStart(`2026-10-${day}`, 0)).toBe('2026-10-11'),
  )

  it.each([12, 13, 14, 15, 16, 17, 18])('a Monday-first week of Oct %i starts on Oct 12', (day) =>
    expect(weekStart(`2026-10-${day}`, 1)).toBe('2026-10-12'),
  )

  it.each([
    ['en-US', '2026-10-11'],
    ['en-GB', '2026-10-12'],
    ['de-DE', '2026-10-12'],
    ['ar-EG', '2026-10-10'],
  ])('weekStart defaults to the %s week start', (locale, start) => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      locale,
    } as Intl.ResolvedDateTimeFormatOptions)
    expect(weekStart('2026-10-14')).toBe(start)
  })

  it.each([
    ['2026-10-01', '2026-09-27'],
    ['2027-01-01', '2026-12-27'],
    ['2026-03-11', '2026-03-08'],
    ['2026-11-04', '2026-11-01'],
  ])('weekStart of %s reaches back to %s across a month, year or DST boundary', (date, start) =>
    expect(weekStart(date, 0)).toBe(start),
  )

  it('dayLabel formats from the date parts', () => {
    const { weekday, day, full } = dayLabel('2026-10-11')
    expect(weekday).toMatch(/Sun/)
    expect(day).toBe(11)
    expect(full).toMatch(/Sunday/)
    expect(full).toMatch(/October/)
  })

  it('weekRange spans the first to the last date without a year in the current year', () => {
    const range = weekRange(weekDates('2026-10-18'), '2026-10-20')
    expect(range).toMatch(/Oct/)
    expect(range).toMatch(/18/)
    expect(range).toMatch(/24/)
    expect(range).not.toMatch(/2026/)
  })

  it('weekRange shows the year across a year boundary', () => {
    const range = weekRange(weekDates('2026-12-27'), '2026-12-31')
    expect(range).toMatch(/2026/)
    expect(range).toMatch(/2027/)
  })

  it('weekRange shows the year for a past-year week', () => {
    expect(weekRange(weekDates('2025-06-01'), '2026-11-06')).toMatch(/2025/)
  })
})

describe('weekHeading', () => {
  it.each([
    [0, '2026-11-01'],
    [1, '2026-11-02'],
  ] as const)('labels This/Next/Last week with firstDay %i', (firstDay, start) => {
    expect(weekHeading(start, '2026-11-04', firstDay)).toBe('This week')
    expect(weekHeading(shiftWeek(start, 1)!, '2026-11-04', firstDay)).toBe('Next week')
    expect(weekHeading(shiftWeek(start, -1)!, '2026-11-04', firstDay)).toBe('Last week')
  })

  it('is null for a misaligned week containing today', () =>
    expect(weekHeading('2026-11-04', '2026-11-04', 0)).toBeNull())

  it('is null two weeks away', () => {
    expect(weekHeading('2026-11-15', '2026-11-04', 0)).toBeNull()
    expect(weekHeading('2026-10-18', '2026-11-04', 0)).toBeNull()
  })
})

describe('parseWeek', () => {
  it.each(['2026-11-01', '2026-11-02', '2026-11-04', '2026-11-07', '0001-01-01', '9999-12-25'])(
    'accepts %s',
    (s) => expect(parseWeek(s)).toBe(s),
  )

  it.each([null, '', '2026-1-5', '2026-01-05x', '2026-02-30', '2026-13-01', '9999-12-26'])(
    'rejects %s',
    (s) => expect(parseWeek(s)).toBeNull(),
  )
})

describe('weekDates', () => {
  it('runs seven days from an unaligned start', () =>
    expect(weekDates('2026-11-04')).toEqual([
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
      '2026-11-09',
      '2026-11-10',
    ]))

  it('crosses a month boundary', () =>
    expect(weekDates('2026-01-29').slice(2, 4)).toEqual(['2026-01-31', '2026-02-01']))

  it('crosses a year boundary', () =>
    expect(weekDates('2026-12-29').slice(2, 4)).toEqual(['2026-12-31', '2027-01-01']))

  it('crosses DST boundaries without skipping or repeating a day', () => {
    expect(weekDates('2026-03-06')).toContain('2026-03-08')
    expect(new Set(weekDates('2026-03-06')).size).toBe(7)
    expect(weekDates('2026-10-30').at(-1)).toBe('2026-11-05')
  })
})

describe('shiftWeek', () => {
  it('moves forward and back by weeks', () => {
    expect(shiftWeek('2026-11-04', 1)).toBe('2026-11-11')
    expect(shiftWeek('2026-11-04', -1)).toBe('2026-10-28')
  })

  it('returns null past each edge', () => {
    expect(shiftWeek('0001-01-07', -1)).toBeNull()
    expect(shiftWeek('0001-01-01', -1)).toBeNull()
    expect(shiftWeek('9999-12-19', 1)).toBeNull()
    expect(shiftWeek('9999-12-18', 0)).toBe('9999-12-18')
  })

  it('stays in range at the edges', () => {
    expect(shiftWeek('0001-01-08', -1)).toBe('0001-01-01')
    expect(shiftWeek('9999-12-18', 1)).toBe('9999-12-25')
  })
})
