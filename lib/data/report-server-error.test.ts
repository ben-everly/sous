import { afterEach, describe, expect, it, vi } from 'vitest'
import { reportServerError } from './report-server-error'

afterEach(() => vi.restoreAllMocks())

describe('reportServerError', () => {
  it('logs a generic error to the console', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const err = new Error('boom')
    reportServerError(err)
    expect(spy).toHaveBeenCalledWith(err)
  })

  it('logs a PostgREST error that carries a fault code', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const err = { code: '23514', message: 'value too long' }
    reportServerError(err)
    expect(spy).toHaveBeenCalledWith(err)
  })
})
