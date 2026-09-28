import { describe, expect, it } from 'vitest'
import { cdxUrl, parseCdx } from './cdx'
import { CUTOFF } from './config'

describe('cdxUrl', () => {
  it('requests the recipe prefix as JSON with both filters and the cutoff', () => {
    const params = new URL(cdxUrl(CUTOFF)).searchParams
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
