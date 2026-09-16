import { describe, expect, it } from 'vitest'
import { type CdxRow } from './cdx'
import { selectCaptures } from './captures'
import { configure, CUTOFF, cutoffCeiling, DEFAULTS } from './config'

const config = (argv: string[]) => {
  const result = configure(argv)
  if (!('config' in result)) throw new Error(`expected a config, got ${JSON.stringify(result)}`)
  return result.config
}

const errors = (argv: string[]) => {
  const result = configure(argv)
  if (!('errors' in result)) throw new Error(`expected errors, got ${JSON.stringify(result)}`)
  return result.errors
}

describe('configure', () => {
  it('applies every default when given no arguments', () => {
    expect(config([])).toEqual({
      out: DEFAULTS.out,
      cutoff: CUTOFF,
      delayMs: 1000,
      limit: undefined,
      refetchCdx: false,
      force: false,
      dryRun: false,
    })
  })

  it('reads --help before validating anything else', () => {
    expect(configure(['--help', '--cutoff', 'nonsense'])).toEqual({ help: true })
  })

  it('fills a partial cutoff up to the last instant it covers', () => {
    expect(config(['--cutoff', '202602']).cutoff).toBe('20260231235959')
  })

  it('keeps --limit 0 distinct from an absent one', () => {
    expect(config(['--limit', '0']).limit).toBe(0)
    expect(config([]).limit).toBeUndefined()
  })

  it('carries the boolean flags through', () => {
    expect(config(['--refetch-cdx', '--force', '--dry-run'])).toMatchObject({
      refetchCdx: true,
      force: true,
      dryRun: true,
    })
  })

  it('reports every bad flag at once rather than the first', () => {
    expect(errors(['--cutoff', '202', '--limit=-1', '--delay=abc'])).toEqual([
      '--cutoff must be a yyyyMMddhhmmss prefix of 4, 6, 8, 10, 12 or 14 digits (got "202")',
      '--delay must be a non-negative number (got "abc")',
      '--limit must be a non-negative number (got "-1")',
    ])
  })

  it('reports an unknown flag instead of throwing it at the operator', () => {
    expect(errors(['--nope'])[0]).toMatch(/--nope/)
  })
})

describe('cutoffCeiling', () => {
  it('fills a partial timestamp up to the last instant it covers', () => {
    expect(cutoffCeiling('2026')).toBe('20261231235959')
    expect(cutoffCeiling('202602')).toBe('20260231235959')
    expect(cutoffCeiling('20260217')).toBe('20260217235959')
    expect(cutoffCeiling('2026021712')).toBe('20260217125959')
    expect(cutoffCeiling('202602171259')).toBe('20260217125959')
  })

  it('leaves a full timestamp alone', () => {
    expect(cutoffCeiling(CUTOFF)).toBe(CUTOFF)
    expect(cutoffCeiling('20260217235959')).toBe('20260217235959')
  })

  it('admits every capture in a partial month and excludes the next one', () => {
    const at = (timestamp: string): CdxRow => ({
      original: `https://www.myplate.gov/recipes/r-${timestamp}`,
      timestamp,
      statuscode: '200',
      digest: 'D',
      length: '100',
    })
    const ceiling = cutoffCeiling('202602')
    expect(ceiling).not.toBeNull()
    expect(
      selectCaptures(
        ['20260201000000', '20260228235959', '20260229120000', '20260301000000'].map(at),
        ceiling as string,
      ).map(({ timestamp }) => timestamp),
    ).toEqual(['20260201000000', '20260228235959', '20260229120000'])
  })

  it('rejects anything it cannot fill unambiguously', () => {
    for (const raw of ['', '202', '20261', '2026021', '2026-02-17', 'abcd', '202602172359590'])
      expect(cutoffCeiling(raw)).toBeNull()
  })
})
