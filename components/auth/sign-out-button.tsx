'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  const router = useRouter()

  const signOut = async () => {
    await createClient().auth.signOut()
    // signOut clears the auth cookies client-side; refresh re-runs the server
    // tree (and the proxy) with no session so the UI reflects the sign-out.
    router.replace('/login')
    router.refresh()
  }

  return (
    <Button onClick={signOut} variant="ghost" size="sm">
      <LogOut />
      Sign out
    </Button>
  )
}
