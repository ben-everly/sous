import Link from 'next/link'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <div className="mt-6 flex gap-8">
        <nav aria-label="Settings" className="w-40 shrink-0">
          <Link href="/settings/kitchens" aria-current="page" className="text-sm font-medium">
            Kitchens
          </Link>
        </nav>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}
