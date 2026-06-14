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
    // signOut clears the auth cookies client-side; refresh re-runs the server tree
    // (and the proxy) with no session.
    router.replace('/login')
    router.refresh()
  }

  return { signOut, pending }
}
