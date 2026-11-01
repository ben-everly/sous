import { describe, expect, it } from 'vitest'
import { queryStatus } from './query-status'

describe('queryStatus', () => {
  it.each([
    [{ data: undefined, isError: false, isFetching: true }, 'loading'],
    [{ data: undefined, isError: true, isFetching: true }, 'loading'],
    [{ data: undefined, isError: true, isFetching: false }, 'error'],
    [{ data: [], isError: true, isFetching: false }, 'ready'],
    [{ data: [], isError: false, isFetching: true }, 'ready'],
  ])('%o is %s', (q, expected) => expect(queryStatus(q)).toBe(expected))
})
