import { SettingsNav } from '@/components/settings/settings-nav'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <div className="mt-6 flex gap-8">
        <SettingsNav />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}
