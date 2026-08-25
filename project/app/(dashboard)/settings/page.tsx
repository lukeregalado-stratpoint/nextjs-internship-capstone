import { requireUser } from "@/lib/auth"
import { SettingsPanels } from "@/components/settings-panels"

export default async function SettingsPage() {
  const user = await requireUser()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground dark:text-paper">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account and application preferences
        </p>
      </div>

      <SettingsPanels user={{ name: user.name, email: user.email }} />
    </div>
  )
}