import { requireAuthedUser } from '@/lib/auth/gate'
import { KitchensManager } from '@/components/kitchens/kitchens-manager'

export default async function KitchensSettingsPage() {
  const user = await requireAuthedUser()

  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight">Kitchens</h2>
      <p className="text-muted-foreground text-sm">Manage the kitchens you own.</p>
      <KitchensManager
        ownerId={user.claims.sub}
        ownerDisplayName={user.profile?.display_name ?? null}
      />
    </section>
  )
}
