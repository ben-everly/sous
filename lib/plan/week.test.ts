import { afterEach, describe, expect, it, vi } from 'vitest'
import { dayLabel, weekOf, weekRange } from './week'

afterEach(() => vi.restoreAllMocks())

describe('week helpers', () => {
  it.each([11, 12, 13, 14, 15, 16, 17])(
    'a Sunday-first weekOf Oct %i starts on Sunday Oct 11',
    (day) => {
      expect(weekOf(new Date(2026, 9, day, 23, 59), 0)).toEqual([
        '2026-10-11',
        '2026-10-12',
        '2026-10-13',
        '2026-10-14',
        '2026-10-15',
        '2026-10-16',
        '2026-10-17',
      ])
    },
  )

  it.each([12, 13, 14, 15, 16, 17, 18])(
    'a Monday-first weekOf Oct %i starts on Monday Oct 12',
    (day) => {
      expect(weekOf(new Date(2026, 9, day, 23, 59), 1)).toEqual([
        '2026-10-12',
        '2026-10-13',
        '2026-10-14',
        '2026-10-15',
        '2026-10-16',
        '2026-10-17',
        '2026-10-18',
      ])
    },
  )

  it.each([
    ['en-US', '2026-10-11'],
    ['en-GB', '2026-10-12'],
    ['de-DE', '2026-10-12'],
    ['ar-EG', '2026-10-10'],
  ])('weekOf defaults to the %s week start', (locale, start) => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      locale,
    } as Intl.ResolvedDateTimeFormatOptions)
    expect(weekOf(new Date(2026, 9, 14))[0]).toBe(start)
  })

  it('crosses a month boundary', () => {
    expect(weekOf(new Date(2026, 8, 30), 0)).toEqual([
      '2026-09-27',
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
    ])
  })

  it('crosses a year boundary', () => {
    expect(weekOf(new Date(2026, 11, 31), 0)).toEqual([
      '2026-12-27',
      '2026-12-28',
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ])
  })

  it('does not skip or repeat a day across spring-forward', () => {
    expect(weekOf(new Date(2026, 2, 11), 0)).toEqual([
      '2026-03-08',
      '2026-03-09',
      '2026-03-10',
      '2026-03-11',
      '2026-03-12',
      '2026-03-13',
      '2026-03-14',
    ])
  })

  it('does not skip or repeat a day across fall-back', () => {
    expect(weekOf(new Date(2026, 10, 4), 0)).toEqual([
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
    ])
  })

  it('dayLabel formats from the date parts', () => {
    const { weekday, day, full } = dayLabel('2026-10-11')
    expect(weekday).toMatch(/Sun/)
    expect(day).toBe(11)
    expect(full).toMatch(/Sunday/)
    expect(full).toMatch(/October/)
  })

  it('weekRange spans the first to the last date', () => {
    const range = weekRange(weekOf(new Date(2026, 9, 19), 0))
    expect(range).toMatch(/Oct/)
    expect(range).toMatch(/18/)
    expect(range).toMatch(/24/)
  })
})
