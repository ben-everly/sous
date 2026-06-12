import { redirect } from 'next/navigation'

// Kitchens is the only section, so /settings resolves straight to it.
export default function SettingsPage() {
  redirect('/settings/kitchens')
}
