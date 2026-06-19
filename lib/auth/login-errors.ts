export const LOGIN_ERRORS = ['auth', 'cancelled', 'recovery_invalid'] as const

export type LoginError = (typeof LOGIN_ERRORS)[number]

export function isLoginError(value: string | null | undefined): value is LoginError {
  return value != null && (LOGIN_ERRORS as readonly string[]).includes(value)
}
