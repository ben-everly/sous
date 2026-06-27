import { describe, expect, it } from 'vitest'
import { signInSchema, signUpSchema, forgotPasswordSchema, resetPasswordSchema } from './schemas'

describe('signInSchema', () => {
  it('accepts a valid email and any non-empty password', () => {
    expect(signInSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true)
  })
  it('rejects an invalid email', () => {
    expect(signInSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false)
  })
  it('rejects an empty password', () => {
    expect(signInSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false)
  })
  it('trims surrounding whitespace from the email', () => {
    const r = signInSchema.safeParse({ email: '  a@b.com  ', password: 'x' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.email).toBe('a@b.com')
  })
})

describe('signUpSchema', () => {
  it('accepts matching 8+ char passwords', () => {
    const r = signUpSchema.safeParse({
      email: 'a@b.com',
      password: 'password1',
      confirmPassword: 'password1',
    })
    expect(r.success).toBe(true)
  })
  it('rejects a password shorter than 8', () => {
    const r = signUpSchema.safeParse({
      email: 'a@b.com',
      password: 'short',
      confirmPassword: 'short',
    })
    expect(r.success).toBe(false)
  })
  it('flags confirmPassword when passwords differ', () => {
    const r = signUpSchema.safeParse({
      email: 'a@b.com',
      password: 'password1',
      confirmPassword: 'password2',
    })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.flatten().fieldErrors.confirmPassword?.[0]).toMatch(/match/i)
  })
  // bcrypt (GoTrue's hasher, no pre-hash) silently truncates past 72 bytes, so cap input
  // rather than let a long passphrase's tail be ignored.
  it('rejects a password longer than 72 bytes', () => {
    const long = 'a'.repeat(73)
    const r = signUpSchema.safeParse({ email: 'a@b.com', password: long, confirmPassword: long })
    expect(r.success).toBe(false)
  })
  // The cap is bytes, not characters: 25 emoji = 50 UTF-16 units (under 72) but 100 UTF-8
  // bytes (over 72), so a char/length cap would wrongly accept it and bcrypt would truncate.
  it('rejects a multibyte password that exceeds 72 bytes despite few characters', () => {
    const emoji = '🔒'.repeat(25)
    const r = signUpSchema.safeParse({ email: 'a@b.com', password: emoji, confirmPassword: emoji })
    expect(r.success).toBe(false)
  })
})

describe('forgotPasswordSchema', () => {
  it('accepts a valid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'a@b.com' }).success).toBe(true)
  })
})

describe('resetPasswordSchema', () => {
  it('accepts matching 8+ char passwords', () => {
    expect(
      resetPasswordSchema.safeParse({ password: 'password1', confirmPassword: 'password1' })
        .success,
    ).toBe(true)
  })
  it('rejects a password shorter than 8', () => {
    expect(
      resetPasswordSchema.safeParse({ password: 'short', confirmPassword: 'short' }).success,
    ).toBe(false)
  })
  it('rejects mismatched passwords', () => {
    expect(
      resetPasswordSchema.safeParse({ password: 'password1', confirmPassword: 'nope' }).success,
    ).toBe(false)
  })
})
