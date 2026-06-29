import type { ReactNode } from 'react'

// Shared titled column for the auth screens. Once a confirmation link is sent, the screen's
// job changes from its flow-specific title to "check your email", so the heading swaps and the
// flow-specific subtitle drops.
export function AuthPanel({
  title,
  subtitle,
  sent,
  children,
}: {
  title: string
  subtitle: string
  sent: boolean
  children: ReactNode
}) {
  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">{sent ? 'Check your email' : title}</h1>
        {!sent && <p className="text-muted-foreground text-sm">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}
