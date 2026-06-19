type AuthErrorLike = { code?: string | null; message?: string | null } | null | undefined

const GENERIC = 'Something went wrong. Please try again.'

// Keyed by GoTrue error code. Copy stays non-enumerating: sign-in failures are
// generic, and "already exists" nudges toward sign-in/reset without confirming.
const BY_CODE: Record<string, string> = {
  invalid_credentials: 'That email or password is incorrect.',
  email_not_confirmed: 'That email or password is incorrect.',
  user_already_exists: 'That email is already registered. Try signing in or resetting your password.',
  email_exists: 'That email is already registered. Try signing in or resetting your password.',
  over_email_send_rate_limit: 'Too many requests. Please wait a few minutes and try again.',
  over_request_rate_limit: 'Too many requests. Please wait a few minutes and try again.',
  weak_password: 'Please choose a password with at least 8 characters.',
  same_password: 'Your new password must be different from your current one.',
  session_expired: 'Your reset link has expired. Request a new one.',
}

export function authErrorMessage(error: AuthErrorLike): string {
  if (!error?.code) return GENERIC
  return BY_CODE[error.code] ?? GENERIC
}
