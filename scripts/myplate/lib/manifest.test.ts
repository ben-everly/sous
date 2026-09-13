import { describe, expect, it } from 'vitest'
import { type Capture } from './captures'
import { pageName } from './store'
import { classifyPlayback, readManifest } from './manifest'

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

  it('names whichever ingredient field schema the page uses', () => {
    for (const template of ['field-mp-ingredients', 'field-ingredients'])
      expect(
        classifyPlayback(capture, {
          httpStatus: 200,
          servedTimestamp: served,
          body: `<div class="${template}">1 apple</div>`,
        }).record,
      ).toMatchObject({ status: 'ok', template })
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

const line = (slug: string, status: string, group = 'flat') =>
  JSON.stringify({ url: `https://www.myplate.gov/recipes/${slug}`, group, slug, status })

describe('readManifest malformed lines', () => {
  const good = (i: number) => line(`r${i}`, 'ok')

  it('names a truncated last line by its file line number', () => {
    expect(readManifest([good(0), good(1), '{"url":"x","stat'].join('\n')).malformed).toEqual([3])
  })

  it('names a malformed line in the middle of the file', () => {
    expect(readManifest([good(0), 'not json', good(2)].join('\n')).malformed).toEqual([2])
  })

  it('counts blank lines when numbering so the numbers match the file', () => {
    expect(readManifest(['', good(1), '', 'nope', good(4)].join('\n')).malformed).toEqual([4])
  })

  it.each(['pending', 'constructor'])(
    'names a line whose status the table does not recognise: %s',
    (status) => {
      const manifest = [good(0), line('r1', status)].join('\n')
      expect(readManifest(manifest).malformed).toEqual([2])
      expect(readManifest(manifest).captured).toEqual(new Set(['flat/r0.html']))
    },
  )

  it('names a line with no page to key on', () => {
    const manifest = [
      good(0),
      JSON.stringify({ url: 'https://www.myplate.gov/recipes/r1', status: 'ok' }),
    ].join('\n')
    expect(readManifest(manifest).malformed).toEqual([2])
    expect(readManifest(manifest).captured).toEqual(new Set(['flat/r0.html']))
  })

  it('reports nothing for a clean or empty manifest', () => {
    expect(readManifest([good(0), good(1)].join('\n')).malformed).toEqual([])
    expect(readManifest('').malformed).toEqual([])
  })
})

describe('readManifest captured pages', () => {
  it('treats every record but a deferred one as done so a resume skips it', () => {
    const manifest = ['ok', 'unverified', 'shell', 'mismatch', 'missing', 'refused', 'deferred']
      .map((status, i) => line(`r${i}`, status))
      .join('\n')
    expect(readManifest(manifest).captured).toEqual(
      new Set([
        'flat/r0.html',
        'flat/r1.html',
        'flat/r2.html',
        'flat/r3.html',
        'flat/r4.html',
        'flat/r5.html',
      ]),
    )
  })

  it('lets a later record supersede an earlier one for the same page', () => {
    expect(readManifest([line('r', 'ok'), line('r', 'deferred')].join('\n')).captured).toEqual(
      new Set(),
    )
    expect(readManifest([line('r', 'deferred'), line('r', 'ok')].join('\n')).captured).toEqual(
      new Set(['flat/r.html']),
    )
  })

  it('keys a page by its file, so a later url variant of it still resumes as captured', () => {
    const recorded = readManifest(
      JSON.stringify({
        url: 'http://www.myplate.gov/recipes/r',
        group: 'flat',
        slug: 'r',
        status: 'ok',
      }),
    ).captured
    expect(recorded.has(pageName({ group: 'flat', slug: 'r' }))).toBe(true)
  })

  it('separates same-slug pages in different groups', () => {
    expect(
      readManifest([line('r', 'ok', 'snap'), line('r', 'ok', 'cnpp')].join('\n')).captured,
    ).toEqual(new Set(['snap/r.html', 'cnpp/r.html']))
  })

  it('handles an absent manifest', () => {
    expect(readManifest('').captured).toEqual(new Set())
  })

  it('keeps the surviving records when a line will not parse', () => {
    const manifest = [
      line('r0', 'ok'),
      '{"url":"https://www.myplate.gov/recipes/r1","stat',
      line('r2', 'ok'),
    ].join('\n')
    expect(readManifest(manifest).captured).toEqual(new Set(['flat/r0.html', 'flat/r2.html']))
  })
})

describe('readManifest pages missing from disk', () => {
  it('counts the terminal records that wrote no file, ignoring deferred ones', () => {
    const manifest = ['ok', 'unverified', 'mismatch', 'missing', 'refused', 'deferred']
      .map((status, i) => line(`r${i}`, status))
      .join('\n')
    expect(readManifest(manifest).withoutPage).toBe(3)
  })

  it('does not count a shell, which wrote a page even though it has no ingredients', () => {
    const manifest = ['ok', 'shell', 'shell', 'missing']
      .map((status, i) => line(`r${i}`, status))
      .join('\n')
    expect(readManifest(manifest).withoutPage).toBe(1)
  })

  it('counts a page once, by its latest record', () => {
    expect(readManifest([line('r', 'mismatch'), line('r', 'ok')].join('\n')).withoutPage).toBe(0)
    expect(readManifest([line('r', 'ok'), line('r', 'mismatch')].join('\n')).withoutPage).toBe(1)
  })

  it('handles an absent manifest', () => {
    expect(readManifest('').withoutPage).toBe(0)
  })
})
