import { afterEach, describe, expect, it, vi } from 'vitest'
import { reportClientError } from './report-client-error'

afterEach(() => vi.restoreAllMocks())

describe('reportClientError', () => {
  it('logs a generic error to the console', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const err = new Error('boom')
    reportClientError(err)
    expect(spy).toHaveBeenCalledWith(err)
  })

  it('logs a PostgREST error that carries a fault code', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const err = { code: '23514', message: 'value too long' }
    reportClientError(err)
    expect(spy).toHaveBeenCalledWith(err)
  })

  it.each([
    ['no-row match', 'PGRST116'],
    ['kitchen limit', 'SC001'],
  ])('ignores an expected %s (%s)', (_, code) => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    reportClientError({ code, message: 'expected' })
    expect(spy).not.toHaveBeenCalled()
  })
})
