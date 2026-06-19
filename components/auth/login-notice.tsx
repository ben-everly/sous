import { cn } from '@/lib/utils'
import type { LoginError } from '@/lib/auth/login-errors'

type Tone = 'error' | 'info'

const NOTICES: Record<LoginError, { message: string; tone: Tone }> = {
  auth: {
    message: 'Something went wrong signing you in. Try again below.',
    tone: 'error',
  },
  cancelled: {
    message: 'Sign-in was cancelled. Try again, or use a different Google account.',
    tone: 'info',
  },
  recovery_invalid: {
    message: 'That password-reset link has expired or was already used. Request a new one below.',
    tone: 'error',
  },
}

export function LoginNotice({ error }: { error: LoginError }) {
  const { message, tone } = NOTICES[error]
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'text-center text-sm',
        tone === 'error' ? 'text-destructive' : 'text-muted-foreground',
      )}
    >
      {message}
    </p>
  )
}
