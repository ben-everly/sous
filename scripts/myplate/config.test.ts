import { describe, expect, it } from 'vitest'
import { CUTOFF } from './cdx'
import { configure, DEFAULTS } from './config'

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
