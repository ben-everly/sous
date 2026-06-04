'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, LoaderCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  const signOut = async () => {
    setFailed(false)
    setPending(true)
    try {
      const { error } = await createClient().auth.signOut()
      if (error) {
        setFailed(true)
        setPending(false)
        return
      }
      // signOut clears the auth cookies client-side; refresh re-runs the server
      // tree (and the proxy) with no session.
      router.replace('/login')
      router.refresh()
    } catch {
      setFailed(true)
      setPending(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {failed && (
        <p role="alert" className="text-destructive text-sm">
          Couldn&apos;t sign you out. Try again.
        </p>
      )}
      <Button onClick={signOut} disabled={pending} aria-busy={pending} variant="ghost" size="sm">
        {pending ? <LoaderCircle className="animate-spin" /> : <LogOut />}
        Sign out
      </Button>
    </div>
  )
}
