type QueryStatus = 'loading' | 'error' | 'ready'

// Cached data wins over a failed refetch, and a retry in flight shows as loading, not error.
export const queryStatus = (q: {
  data: unknown
  isError: boolean
  isFetching: boolean
}): QueryStatus =>
  q.data === undefined ? (q.isError && !q.isFetching ? 'error' : 'loading') : 'ready'
