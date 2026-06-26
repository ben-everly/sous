import { AUTH_PATHS } from './routes'

export const LOGIN_ERRORS = ['auth', 'cancelled', 'confirmation_invalid'] as const

export type LoginError = (typeof LOGIN_ERRORS)[number]

export function isLoginError(value: string | null | undefined): value is LoginError {
  return value != null && (LOGIN_ERRORS as readonly string[]).includes(value)
}

// Where a missing/expired/replayed confirmation token sends the user to start over.
export const CONFIRMATION_INVALID_URL = `${AUTH_PATHS.login}?error=confirmation_invalid`
