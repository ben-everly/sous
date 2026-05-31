export const LOGIN_ERRORS = ['auth', 'cancelled'] as const

export type LoginError = (typeof LOGIN_ERRORS)[number]

const MESSAGES: Record<LoginError, string> = {
  auth: "Couldn't complete sign-in, please try again.",
  cancelled: 'Sign-in was cancelled.',
}

export function loginErrorMessage(error: LoginError): string {
  return MESSAGES[error]
}

export function isLoginError(value: string | null | undefined): value is LoginError {
  return value != null && (LOGIN_ERRORS as readonly string[]).includes(value)
}
