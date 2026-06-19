'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const SECTIONS = [{ href: '/settings/kitchens', label: 'Kitchens' }]

export function SettingsNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Settings" className="flex w-40 shrink-0 flex-col gap-1">
      {SECTIONS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? 'page' : undefined}
          className="text-sm font-medium"
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}
