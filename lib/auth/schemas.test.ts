import { describe, expect, it } from 'vitest'
import {
  signInSchema,
  signUpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './schemas'

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
