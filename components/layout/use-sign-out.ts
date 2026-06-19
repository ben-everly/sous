'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export function useSignOut() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const signOut = async () => {
    setPending(true)
    const { error } = await createClient().auth.signOut()
    if (error) {
      setPending(false)
      toast.error("Couldn't sign you out. Try again.")
      return
    }
    // signOut clears the auth cookies; replace + refresh re-run the server tree (and proxy) with no session.
    // pending is deliberately left set: router.replace unmounts the caller, so there's nothing to reset.
    router.replace('/login')
    router.refresh()
  }

  return { signOut, pending }
}
