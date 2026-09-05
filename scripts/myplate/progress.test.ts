import { describe, expect, it } from 'vitest'
import { type CaptureStatus } from './manifest'
import { abortReason, advance, NOTHING_YET, summary } from './progress'

const fold = (statuses: CaptureStatus[]) => statuses.reduce(advance, NOTHING_YET)

const repeat = (status: CaptureStatus, times: number): CaptureStatus[] =>
  Array.from({ length: times }, () => status)

describe('advance', () => {
  it('counts every status seen', () => {
    expect(fold(['ok', 'ok', 'shell', 'missing']).tally).toEqual({ ok: 2, shell: 1, missing: 1 })
  })

  it('tracks the current run of one status', () => {
    expect(fold(['ok', 'shell', 'shell']).streak).toEqual({ status: 'shell', count: 2 })
  })

  it('restarts the run when the status changes', () => {
    expect(fold(['shell', 'shell', 'ok']).streak).toEqual({ status: 'ok', count: 1 })
  })
})

describe('abortReason', () => {
  it('keeps going while nothing has run long enough', () => {
    expect(abortReason(NOTHING_YET)).toBeNull()
    expect(abortReason(fold(repeat('shell', 9)))).toBeNull()
    expect(abortReason(fold(repeat('deferred', 9)))).toBeNull()
  })

  it('aborts on ten unanswered requests', () => {
    expect(abortReason(fold(repeat('deferred', 10)))).toMatch(/10 consecutive pages the Archive/)
  })

  it('aborts on ten pages with no ingredient markup, naming both likely causes', () => {
    expect(abortReason(fold(repeat('shell', 10)))).toMatch(
      /--cutoff is later than|template changed/,
    )
  })

  it('never aborts on a terminal status a re-run would only see again', () => {
    for (const status of ['ok', 'unverified', 'mismatch', 'missing', 'refused'] as CaptureStatus[])
      expect(abortReason(fold(repeat(status, 50)))).toBeNull()
  })

  it('does not abort when a different status breaks the run in two', () => {
    expect(abortReason(fold([...repeat('shell', 9), 'ok', ...repeat('shell', 9)]))).toBeNull()
  })
})

describe('summary', () => {
  it('reads as a tally, and says nothing when nothing ran', () => {
    expect(summary(fold(['ok', 'ok', 'shell']))).toBe('ok: 2, shell: 1')
    expect(summary(NOTHING_YET)).toBe('')
  })
})
