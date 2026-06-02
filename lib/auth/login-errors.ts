export const LOGIN_ERRORS = ['auth', 'cancelled'] as const

export type LoginError = (typeof LOGIN_ERRORS)[number]

// 'error' = something actually failed (assertive, destructive styling);
// 'info' = a benign outcome like backing out on Google (polite, muted styling).
export type LoginErrorTone = 'error' | 'info'

const ERRORS: Record<LoginError, { message: string; tone: LoginErrorTone }> = {
  auth: { message: 'Something went wrong signing you in. Try again below.', tone: 'error' },
  cancelled: {
    message: 'Sign-in was cancelled. Try again, or use a different Google account.',
    tone: 'info',
  },
}

export function loginError(error: LoginError) {
  return ERRORS[error]
}

export function isLoginError(value: string | null | undefined): value is LoginError {
  return value != null && (LOGIN_ERRORS as readonly string[]).includes(value)
}
