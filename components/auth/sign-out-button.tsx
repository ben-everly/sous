'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, LoaderCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const signOut = async () => {
    setPending(true)
    try {
      const { error } = await createClient().auth.signOut()
      if (error) {
        setPending(false)
        return
      }
      // signOut clears the auth cookies client-side; refresh re-runs the server
      // tree (and the proxy) with no session.
      router.replace('/login')
      router.refresh()
    } catch {
      setPending(false)
    }
  }

  return (
    <Button onClick={signOut} disabled={pending} aria-busy={pending} variant="ghost" size="sm">
      {pending ? <LoaderCircle className="animate-spin" /> : <LogOut />}
      Sign out
    </Button>
  )
}
