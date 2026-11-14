import { renderHook } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { useIsClient } from './use-is-client'

function Probe() {
  return <>{String(useIsClient())}</>
}

describe('useIsClient', () => {
  it('is false on the server', () => {
    expect(renderToString(<Probe />)).toBe('false')
  })

  it('is true on the client', () => {
    expect(renderHook(() => useIsClient()).result.current).toBe(true)
  })
})
