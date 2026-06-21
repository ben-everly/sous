import { AUTH_PATHS } from './routes'

export const FORGOT_PASSWORD_ERRORS = ['recovery_invalid'] as const

export type ForgotPasswordError = (typeof FORGOT_PASSWORD_ERRORS)[number]

export function isForgotPasswordError(
  value: string | null | undefined,
): value is ForgotPasswordError {
  return value != null && (FORGOT_PASSWORD_ERRORS as readonly string[]).includes(value)
}

// Where a dead/expired/replayed recovery session sends the user for a fresh link.
export const RECOVERY_INVALID_URL = `${AUTH_PATHS.forgotPassword}?error=recovery_invalid`
