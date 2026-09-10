import { describe, expect, it } from 'vitest'
import { groupCounts, playbackUrl, selectCaptures } from './captures'
import { CUTOFF, type CdxRow } from './cdx'

const row = (original: string, timestamp: string, overrides: Partial<CdxRow> = {}): CdxRow => ({
  original,
  timestamp,
  statuscode: '200',
  digest: 'DIGEST',
  length: '19954',
  ...overrides,
})

describe('selectCaptures', () => {
  it('keeps the newest capture at or before the cutoff', () => {
    expect(
      selectCaptures(
        [
          row('https://www.myplate.gov/recipes/apple-cake', '20250101000000'),
          row('https://www.myplate.gov/recipes/apple-cake', '20260210000000'),
          row('https://www.myplate.gov/recipes/apple-cake', '20260306000000'),
        ],
        CUTOFF,
      ).map(({ timestamp }) => timestamp),
    ).toEqual(['20260210000000'])
  })

  it('collapses scheme, host, case, and trailing-slash variants of one path', () => {
    expect(
      selectCaptures(
        [
          row('http://myplate.gov/recipes/apple-cake', '20250101000000'),
          row('https://www.myplate.gov/recipes/Apple-Cake/', '20250102000000'),
          row('https://www.myplate.gov/recipes/apple-cake', '20250103000000'),
        ],
        CUTOFF,
      ),
    ).toHaveLength(1)
  })

  it('excludes query-string variants, non-200 rows, and non-recipe paths', () => {
    expect(
      selectCaptures(
        [
          row('https://www.myplate.gov/recipes/apple-cake?ajax_form=1', '20250101000000'),
          row('https://www.myplate.gov/recipes/apple-cake', '20250101000000', {
            statuscode: '301',
          }),
          row('https://www.myplate.gov/recipes', '20250101000000'),
          row('https://www.myplate.gov/recipes-cookbooks-and-menus', '20250101000000'),
          row('https://www.myplate.gov/recipes/snap/a/b/c', '20250101000000'),
        ],
        CUTOFF,
      ),
    ).toEqual([])
  })

  it('files a two-segment URL under its group and a flat one under flat', () => {
    expect(
      selectCaptures(
        [
          row('https://www.myplate.gov/recipes/myplate-cnpp/apple-cake', '20250101000000'),
          row('https://www.myplate.gov/recipes/apple-cake', '20250101000000'),
        ],
        CUTOFF,
      ).map(({ group, slug }) => ({ group, slug })),
    ).toEqual([
      { group: 'flat', slug: 'apple-cake' },
      { group: 'myplate-cnpp', slug: 'apple-cake' },
    ])
  })

  it('keeps percent-encoded and traversal-shaped segments inside the output tree', () => {
    expect(
      selectCaptures(
        [
          row(
            'https://www.myplate.gov/recipes/ensalada-de-manzana%20y%20pl%C3%A1tano',
            '20250101000000',
          ),
          row('https://www.myplate.gov/recipes/%2E%2E%2F%2E%2E%2Fetc/passwd', '20250101000000'),
        ],
        CUTOFF,
      ).map(({ group, slug }) => `${group}/${slug}`),
    ).toEqual(['flat/ensalada-de-manzana-y-pl-tano', 'unnamed/passwd'])
  })

  it('keeps a row whose percent-encoding is not decodable rather than aborting the run', () => {
    expect(
      selectCaptures(
        [row('https://www.myplate.gov/recipes/caf%E9-latte', '20250101000000')],
        CUTOFF,
      ).map(({ group, slug }) => `${group}/${slug}`),
    ).toEqual(['flat/caf-e9-latte'])
  })

  it('suffixes both sides of a slug collision so neither overwrites the other', () => {
    const slugs = selectCaptures(
      [
        row('https://www.myplate.gov/recipes/apple cake', '20250101000000'),
        row('https://www.myplate.gov/recipes/apple+cake', '20250101000000'),
      ],
      CUTOFF,
    ).map(({ slug }) => slug)
    expect(new Set(slugs).size).toBe(2)
    expect(slugs.every((slug) => /^apple-cake-[0-9a-f]{8}$/.test(slug))).toBe(true)
  })

  it('parses the CDX length into a number and tolerates a blank one', () => {
    expect(
      selectCaptures(
        [row('https://www.myplate.gov/recipes/apple-cake', '20250101000000', { length: '' })],
        CUTOFF,
      )[0].cdxLength,
    ).toBe(0)
  })
})

describe('groupCounts', () => {
  const counts = (paths: string[]) =>
    groupCounts(
      selectCaptures(
        paths.map((path) => row(`https://www.myplate.gov/recipes/${path}`, '20250101000000')),
        CUTOFF,
      ),
    )

  it('counts captures per group', () => {
    expect(counts(['a', 'b', 'snap/c'])).toEqual([
      ['flat', 2],
      ['snap', 1],
    ])
  })

  it('puts the largest group first, whatever order the captures arrive in', () => {
    expect(counts(['a', 'snap/b', 'snap/c', 'snap/d'])).toEqual([
      ['snap', 3],
      ['flat', 1],
    ])
  })
})

describe('playbackUrl', () => {
  it('requests the exact timestamp as raw archived bytes', () => {
    expect(
      playbackUrl({
        timestamp: '20241126235234',
        url: 'https://www.myplate.gov/recipes/2-step-chicken',
      }),
    ).toBe(
      'https://web.archive.org/web/20241126235234id_/https://www.myplate.gov/recipes/2-step-chicken',
    )
  })
})
