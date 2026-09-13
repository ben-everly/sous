import { CUTOFF } from './config.ts'
import { type CaptureStatus } from './manifest.ts'

// Only statuses meaning nothing is progressing belong here — a run of 404s is progress the
// next run skips, and must not abort a healthy job.
const ABORTS: { status: CaptureStatus; max: number; reason: (count: number) => string }[] = [
  {
    status: 'deferred',
    max: 10,
    reason: (count) => `${count} consecutive pages the Archive did not answer. Re-run to resume.`,
  },
  {
    status: 'shell',
    max: 10,
    reason: (count) =>
      `${count} consecutive pages have no ingredient markup. Either --cutoff is later than ${CUTOFF}, or the template changed — the pages are on disk to compare.`,
  },
]

export type Progress = {
  tally: Partial<Record<CaptureStatus, number>>
  streak: { status: CaptureStatus | null; count: number }
}

export const NOTHING_YET: Progress = { tally: {}, streak: { status: null, count: 0 } }

export const advance = ({ tally, streak }: Progress, status: CaptureStatus): Progress => ({
  tally: { ...tally, [status]: (tally[status] ?? 0) + 1 },
  streak: status === streak.status ? { status, count: streak.count + 1 } : { status, count: 1 },
})

export const abortReason = ({ streak }: Progress) =>
  ABORTS.find(({ status, max }) => status === streak.status && streak.count >= max)?.reason(
    streak.count,
  ) ?? null

export const summary = ({ tally }: Progress) =>
  Object.entries(tally)
    .map(([status, count]) => `${status}: ${count}`)
    .join(', ')
