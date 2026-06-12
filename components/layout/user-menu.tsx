'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, Settings, LogOut, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { AuthedUser } from '@/lib/auth/user'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function UserMenu({ user }: { user: AuthedUser }) {
  const router = useRouter()
  const name = user.profile?.display_name
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="flex items-center gap-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-md"
      >
        <Avatar>
          {/* TODO(launch): hotlinking Google's CDN leaks IP/timing to Google (no-referrer
              hides only the page URL) — copy avatars into Storage; also fixes URL expiry. */}
          {user.profile?.avatar_url && (
            <AvatarImage
              src={user.profile.avatar_url}
              alt={name ?? 'Your profile'}
              referrerPolicy="no-referrer"
            />
          )}
          <AvatarFallback>
            <User className="size-4" aria-hidden="true" />
          </AvatarFallback>
        </Avatar>
        {name && <span className="text-sm font-medium">{name}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={pending}
          aria-busy={pending}
          onSelect={(e) => {
            // Keep the menu logic running instead of letting the select close + unmount it.
            e.preventDefault()
            signOut()
          }}
        >
          {pending ? <LoaderCircle className="animate-spin" /> : <LogOut />}
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
