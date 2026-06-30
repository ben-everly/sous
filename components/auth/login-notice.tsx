import Link from 'next/link'
import { cn } from '@/lib/utils'
import { AUTH_PATHS } from '@/lib/auth/routes'
import type { LoginError } from '@/lib/auth/login-errors'
import type { ForgotPasswordError } from '@/lib/auth/forgot-password-errors'

type Tone = 'error' | 'info'

type AuthNoticeError = LoginError | ForgotPasswordError

const NOTICES: Record<
  AuthNoticeError,
  { message: string; tone: Tone; action?: { href: string; label: string } }
> = {
  auth: {
    message: 'Something went wrong signing you in. Try again below.',
    tone: 'error',
  },
  cancelled: {
    message: 'Sign-in was cancelled. Try again, or use a different Google account.',
    tone: 'info',
  },
  recovery_invalid: {
    message: 'That password-reset link has expired or was already used.',
    tone: 'error',
    action: { href: AUTH_PATHS.forgotPassword, label: 'Request a new one' },
  },
  confirmation_invalid: {
    message: 'That link is expired or has already been used. Sign in or',
    tone: 'error',
    action: { href: AUTH_PATHS.resendConfirmation, label: 'request a new link' },
  },
}

export function LoginNotice({ error }: { error: AuthNoticeError }) {
  const { message, tone, action } = NOTICES[error]
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'text-center text-sm',
        tone === 'error' ? 'text-destructive' : 'text-muted-foreground',
      )}
    >
      {message}
      {action && (
        <>
          {' '}
          <Link href={action.href} className="underline underline-offset-4">
            {action.label}
          </Link>
          .
        </>
      )}
    </p>
  )
}
