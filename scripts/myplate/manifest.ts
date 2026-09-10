import { createHash } from 'node:crypto'

import { type Capture } from './captures.ts'

// Only `deferred` is retryable: every other status is an answer the Archive already gave.
const STATUSES = {
  ok: { retryable: false, wrotePage: true },
  unverified: { retryable: false, wrotePage: true },
  shell: { retryable: false, wrotePage: true },
  mismatch: { retryable: false, wrotePage: false },
  missing: { retryable: false, wrotePage: false },
  refused: { retryable: false, wrotePage: false },
  deferred: { retryable: true, wrotePage: false },
} as const

export type CaptureStatus = keyof typeof STATUSES

export type ManifestRecord = Capture & {
  status: CaptureStatus
  fetchedAt: string
  httpStatus?: number
  bytes?: number
  sha256?: string
  template?: string | null
  servedTimestamp?: string | null
  error?: string
}

const TEMPLATES = ['field-mp-ingredients', 'field-ingredients'] as const

const classifyHtml = (html: string) => TEMPLATES.find((template) => html.includes(template)) ?? null

export type Fetched =
  | { failure: string }
  | {
      httpStatus: number
      location?: string | null
      servedTimestamp?: string | null
      body: string
    }

export const classifyPlayback = (
  capture: Capture,
  result: Fetched,
): { record: Omit<ManifestRecord, 'fetchedAt'>; write: boolean } => {
  if ('failure' in result)
    return { record: { ...capture, status: 'deferred', error: result.failure }, write: false }

  const { httpStatus, body } = result
  if (httpStatus < 200 || httpStatus > 299) {
    const location = result.location ?? null
    return {
      record: {
        ...capture,
        status: httpStatus === 404 ? 'missing' : 'refused',
        httpStatus,
        error: `HTTP ${httpStatus}${location ? ` -> ${location}` : ''}`,
      },
      write: false,
    }
  }

  // Playback serves the nearest capture, so a differing timestamp means these bytes are from
  // another snapshot — indistinguishable from a good page once written.
  const servedTimestamp = result.servedTimestamp ?? null
  if (servedTimestamp && servedTimestamp !== capture.timestamp)
    return {
      record: {
        ...capture,
        status: 'mismatch',
        httpStatus,
        servedTimestamp,
        error: `served ${servedTimestamp}, wanted ${capture.timestamp}`,
      },
      write: false,
    }

  const template = classifyHtml(body)
  return {
    record: {
      ...capture,
      status: template === null ? 'shell' : servedTimestamp ? 'ok' : 'unverified',
      httpStatus,
      bytes: Buffer.byteLength(body),
      sha256: createHash('sha256').update(body).digest('hex'),
      template,
      servedTimestamp,
    },
    write: true,
  }
}

export type ManifestSummary = {
  malformed: number[]
  captured: Set<string>
  withoutPage: number
}

const parseRecord = (text: string) => {
  try {
    const { url, status } = JSON.parse(text) as ManifestRecord
    return url && status in STATUSES ? { url, status } : null
  } catch {
    return null
  }
}

export const readManifest = (manifest: string): ManifestSummary => {
  const latest = new Map<string, CaptureStatus>()
  const malformed: number[] = []
  manifest.split('\n').forEach((text, index) => {
    if (!text) return
    const record = parseRecord(text)
    // --force appends a second record per url, so the last one describes the file on disk.
    if (record) latest.set(record.url, record.status)
    else malformed.push(index + 1)
  })

  const terminal = [...latest].filter(([, status]) => !STATUSES[status].retryable)
  return {
    malformed,
    captured: new Set(terminal.map(([url]) => url)),
    withoutPage: terminal.filter(([, status]) => !STATUSES[status].wrotePage).length,
  }
}
