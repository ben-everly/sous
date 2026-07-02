import { MIN_PASSWORD_LENGTH } from './schemas'

export type AuthErrorLike = { code?: string | null; message?: string | null } | null | undefined

const GENERIC = 'Something went wrong. Please try again.'

// Keyed by GoTrue error code. Copy stays non-enumerating: sign-in failures are
// generic, and "already exists" nudges toward sign-in/reset without confirming.
const BY_CODE: Record<string, string> = {
  invalid_credentials: 'That email or password is incorrect.',
  email_not_confirmed: 'That email or password is incorrect.',
  user_already_exists: 'If you already have an account, try signing in or resetting your password.',
  email_exists: 'If you already have an account, try signing in or resetting your password.',
  over_email_send_rate_limit: 'You requested that recently — wait a moment, then try again.',
  over_request_rate_limit: 'Too many requests. Please wait a few minutes and try again.',
  weak_password: `Please choose a password with at least ${MIN_PASSWORD_LENGTH} characters.`,
  same_password: 'Your new password must be different from your current one.',
}

export function authErrorMessage(error: AuthErrorLike): string {
  if (!error?.code) return GENERIC
  return BY_CODE[error.code] ?? GENERIC
}
