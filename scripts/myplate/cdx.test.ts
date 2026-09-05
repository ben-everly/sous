import { describe, expect, it } from 'vitest'
import { selectCaptures } from './captures'
import { cdxUrl, CUTOFF, cutoffCeiling, parseCdx, type CdxRow } from './cdx'

describe('cdxUrl', () => {
  it('requests the recipe prefix as JSON with both filters and the cutoff', () => {
    const params = new URL(cdxUrl()).searchParams
    expect(params.get('url')).toBe('myplate.gov/recipes/*')
    expect(params.get('output')).toBe('json')
    expect(params.get('to')).toBe(CUTOFF)
    expect(params.getAll('filter')).toEqual(['statuscode:200', 'mimetype:text/html'])
    expect(params.get('fl')).toBe('original,timestamp,statuscode,digest,length')
  })
})

describe('parseCdx', () => {
  it('maps rows by header position rather than assuming field order', () => {
    expect(
      parseCdx(
        JSON.stringify([
          ['timestamp', 'original', 'length', 'digest', 'statuscode'],
          ['20260101000000', 'https://www.myplate.gov/recipes/x', '100', 'D', '200'],
        ]),
      ),
    ).toEqual([
      {
        original: 'https://www.myplate.gov/recipes/x',
        timestamp: '20260101000000',
        statuscode: '200',
        digest: 'D',
        length: '100',
      },
    ])
  })

  it('returns nothing for an empty response', () => {
    expect(parseCdx('[]')).toEqual([])
  })

  it('rejects a response missing required fields', () => {
    expect(() => parseCdx(JSON.stringify([['original', 'timestamp']]))).toThrow(
      /missing fields: statuscode, digest, length/,
    )
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
