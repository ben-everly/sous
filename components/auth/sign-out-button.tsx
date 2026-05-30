'use client'

import { LogOut } from 'lucide-react'
import { signOutAction } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="ghost" size="sm">
        <LogOut />
        Sign out
      </Button>
    </form>
  )
}
