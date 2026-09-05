import { describe, expect, it } from 'vitest'
import { type Capture } from './captures'
import { classifyHtml, classifyPlayback, readManifest } from './manifest'

describe('classifyHtml', () => {
  it('names whichever ingredient field schema the page uses', () => {
    expect(classifyHtml('<div class="field-mp-ingredients">')).toBe('field-mp-ingredients')
    expect(classifyHtml('<div class="field-ingredients">')).toBe('field-ingredients')
  })

  it('returns null for a shell with no ingredient markup', () => {
    expect(classifyHtml('<html><body>Page not found</body></html>')).toBeNull()
  })
})

describe('classifyPlayback', () => {
  const capture: Capture = {
    url: 'https://www.myplate.gov/recipes/apple-cake',
    timestamp: '20260217120000',
    digest: 'DIGEST',
    cdxLength: 19954,
    group: 'flat',
    slug: 'apple-cake',
  }
  const served = '20260217120000'
  const page = '<div class="field-mp-ingredients">1 apple</div>'

  it('defers an unanswered request without writing a page', () => {
    expect(classifyPlayback(capture, { failure: 'fetch failed' })).toEqual({
      record: { ...capture, status: 'deferred', error: 'fetch failed' },
      write: false,
    })
  })

  it('records a 404 as missing and any other refusal as refused', () => {
    expect(classifyPlayback(capture, { httpStatus: 404, body: '' }).record).toMatchObject({
      status: 'missing',
      error: 'HTTP 404',
    })
    expect(classifyPlayback(capture, { httpStatus: 403, body: '' }).record).toMatchObject({
      status: 'refused',
      error: 'HTTP 403',
    })
  })

  it('names where a redirect pointed rather than accepting the capture it offers', () => {
    const { record, write } = classifyPlayback(capture, {
      httpStatus: 302,
      location: 'https://web.archive.org/web/20260306000000/https://www.myplate.gov/recipes/x',
      body: '',
    })
    expect(write).toBe(false)
    expect(record).toMatchObject({
      status: 'refused',
      error:
        'HTTP 302 -> https://web.archive.org/web/20260306000000/https://www.myplate.gov/recipes/x',
    })
  })

  it('refuses to write a body served from a different capture', () => {
    const { record, write } = classifyPlayback(capture, {
      httpStatus: 200,
      servedTimestamp: '20260306000000',
      body: page,
    })
    expect(write).toBe(false)
    expect(record).toMatchObject({
      status: 'mismatch',
      servedTimestamp: '20260306000000',
      error: 'served 20260306000000, wanted 20260217120000',
    })
    expect(record.sha256).toBeUndefined()
  })

  it('records a verified page with its bytes, hash and template', () => {
    const { record, write } = classifyPlayback(capture, {
      httpStatus: 200,
      servedTimestamp: served,
      body: page,
    })
    expect(write).toBe(true)
    expect(record).toMatchObject({
      status: 'ok',
      bytes: 47,
      template: 'field-mp-ingredients',
      servedTimestamp: '20260217120000',
    })
    expect(record.sha256).toMatch(/^[0-9a-f]{64}$/)
  })

  it('marks a page it cannot verify unverified but still writes it', () => {
    const { record, write } = classifyPlayback(capture, { httpStatus: 200, body: page })
    expect(write).toBe(true)
    expect(record).toMatchObject({ status: 'unverified', servedTimestamp: null })
  })

  it('records a page with no ingredient markup as a shell, verified or not', () => {
    expect(
      classifyPlayback(capture, {
        httpStatus: 200,
        servedTimestamp: served,
        body: '<html></html>',
      }),
    ).toMatchObject({ record: { status: 'shell', template: null }, write: true })
    expect(classifyPlayback(capture, { httpStatus: 200, body: '<html></html>' })).toMatchObject({
      record: { status: 'shell' },
      write: true,
    })
  })
})

describe('readManifest malformed lines', () => {
  const good = (i: number) =>
    JSON.stringify({ url: `https://www.myplate.gov/recipes/r${i}`, status: 'ok' })

  it('names a truncated last line by its file line number', () => {
    expect(readManifest([good(0), good(1), '{"url":"x","stat'].join('\n')).malformed).toEqual([3])
  })

  it('names a malformed line in the middle of the file', () => {
    expect(readManifest([good(0), 'not json', good(2)].join('\n')).malformed).toEqual([2])
  })

  it('counts blank lines when numbering so the numbers match the file', () => {
    expect(readManifest(['', good(1), '', 'nope', good(4)].join('\n')).malformed).toEqual([4])
  })

  it('names a line whose status the table does not recognise', () => {
    const manifest = [
      good(0),
      JSON.stringify({ url: 'https://www.myplate.gov/recipes/r1', status: 'pending' }),
    ].join('\n')
    expect(readManifest(manifest).malformed).toEqual([2])
    expect(readManifest(manifest).captured).toEqual(new Set(['https://www.myplate.gov/recipes/r0']))
  })

  it('reports nothing for a clean or empty manifest', () => {
    expect(readManifest([good(0), good(1)].join('\n')).malformed).toEqual([])
    expect(readManifest('').malformed).toEqual([])
  })
})

describe('readManifest captured urls', () => {
  it('treats every record but a deferred one as done so a resume skips it', () => {
    const manifest = ['ok', 'unverified', 'shell', 'mismatch', 'missing', 'refused', 'deferred']
      .map((status, i) => JSON.stringify({ url: `https://www.myplate.gov/recipes/r${i}`, status }))
      .join('\n')
    expect(readManifest(manifest).captured).toEqual(
      new Set([
        'https://www.myplate.gov/recipes/r0',
        'https://www.myplate.gov/recipes/r1',
        'https://www.myplate.gov/recipes/r2',
        'https://www.myplate.gov/recipes/r3',
        'https://www.myplate.gov/recipes/r4',
        'https://www.myplate.gov/recipes/r5',
      ]),
    )
  })

  it('lets a later record supersede an earlier one for the same url', () => {
    const line = (status: string) =>
      JSON.stringify({ url: 'https://www.myplate.gov/recipes/r', status })
    expect(readManifest([line('ok'), line('deferred')].join('\n')).captured).toEqual(new Set())
    expect(readManifest([line('deferred'), line('ok')].join('\n')).captured).toEqual(
      new Set(['https://www.myplate.gov/recipes/r']),
    )
  })

  it('handles an absent manifest', () => {
    expect(readManifest('').captured).toEqual(new Set())
  })

  it('keeps the surviving records when a line will not parse', () => {
    const manifest = [
      JSON.stringify({ url: 'https://www.myplate.gov/recipes/r0', status: 'ok' }),
      '{"url":"https://www.myplate.gov/recipes/r1","stat',
      JSON.stringify({ url: 'https://www.myplate.gov/recipes/r2', status: 'ok' }),
    ].join('\n')
    expect(readManifest(manifest).captured).toEqual(
      new Set(['https://www.myplate.gov/recipes/r0', 'https://www.myplate.gov/recipes/r2']),
    )
  })
})

describe('readManifest pages missing from disk', () => {
  it('counts the terminal records that wrote no file, ignoring deferred ones', () => {
    const manifest = ['ok', 'unverified', 'mismatch', 'missing', 'refused', 'deferred']
      .map((status, i) => JSON.stringify({ url: `https://www.myplate.gov/recipes/r${i}`, status }))
      .join('\n')
    expect(readManifest(manifest).withoutPage).toBe(3)
  })

  it('does not count a shell, which wrote a page even though it has no ingredients', () => {
    const manifest = ['ok', 'shell', 'shell', 'missing']
      .map((status, i) => JSON.stringify({ url: `https://www.myplate.gov/recipes/r${i}`, status }))
      .join('\n')
    expect(readManifest(manifest).withoutPage).toBe(1)
  })

  it('counts a url once, by its latest record', () => {
    const line = (status: string) =>
      JSON.stringify({ url: 'https://www.myplate.gov/recipes/r', status })
    expect(readManifest([line('mismatch'), line('ok')].join('\n')).withoutPage).toBe(0)
    expect(readManifest([line('ok'), line('mismatch')].join('\n')).withoutPage).toBe(1)
  })

  it('handles an absent manifest', () => {
    expect(readManifest('').withoutPage).toBe(0)
  })
})
