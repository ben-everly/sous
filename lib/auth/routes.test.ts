import { describe, it, expect } from 'vitest'
import { isPublicPath, loginRedirectPath } from './routes'

describe('isPublicPath', () => {
  it('treats /login as public (exact match)', () => {
    expect(isPublicPath('/login')).toBe(true)
  })

  it('treats the /auth/* subtree as public (prefix)', () => {
    expect(isPublicPath('/auth/callback')).toBe(true)
  })

  it('treats /login/anything as NOT public (exact match for /login)', () => {
    expect(isPublicPath('/login/anything')).toBe(false)
  })

  it('treats protected routes as NOT public', () => {
    expect(isPublicPath('/')).toBe(false)
    expect(isPublicPath('/dashboard')).toBe(false)
  })

  it('treats the email/password auth routes as public', () => {
    expect(isPublicPath('/register')).toBe(true)
    expect(isPublicPath('/forgot-password')).toBe(true)
    expect(isPublicPath('/reset-password')).toBe(true)
  })

  it('still gates a protected route', () => {
    expect(isPublicPath('/kitchen')).toBe(false)
  })
})

describe('loginRedirectPath', () => {
  it('targets /login with no next for the root path', () => {
    expect(loginRedirectPath('/', '')).toBe('/login')
  })

  it('targets /login for a bare protected path', () => {
    expect(loginRedirectPath('/dashboard', '')).toBe(
      `/login?${new URLSearchParams({ next: '/dashboard' })}`,
    )
  })

  it('preserves the attempted path and query as next', () => {
    expect(loginRedirectPath('/recipes/1', '?sort=new')).toBe(
      `/login?${new URLSearchParams({ next: '/recipes/1?sort=new' })}`,
    )
  })
})
