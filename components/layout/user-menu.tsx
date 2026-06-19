'use client'

import Link from 'next/link'
import { User, Settings, LogOut, LoaderCircle } from 'lucide-react'
import type { AuthedUser } from '@/lib/auth/user'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSignOut } from './use-sign-out'

export function UserMenu({ user }: { user: AuthedUser }) {
  const name = user.profile?.display_name
  const { signOut, pending } = useSignOut()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="flex items-center gap-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-md"
      >
        <Avatar>
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
            // Stop the select from closing the menu, which would unmount the spinner mid-sign-out.
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
