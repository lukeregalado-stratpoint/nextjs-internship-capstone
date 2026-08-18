import { User, Bell, Shield, Palette } from "lucide-react"
import { requireUser } from "@/lib/auth"
import { SettingsForm } from "@/components/settings-form"

// Only "Profile" is wired up right now — the rest are real nav items for
// sections that don't have a page yet, so they're shown but disabled
// rather than pretending to link somewhere.
const SETTINGS_NAV = [
  { name: "Profile", icon: User, active: true },
  { name: "Notifications", icon: Bell, active: false },
  { name: "Security", icon: Shield, active: false },
  { name: "Appearance", icon: Palette, active: false },
]

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground dark:text-paper mb-4">Settings</h3>
          <nav className="space-y-2">
            {SETTINGS_NAV.map((item) => (
              <button
                key={item.name}
                type="button"
                disabled={!item.active}
                title={item.active ? undefined : "Coming soon"}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  item.active
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/50 dark:text-paper/40 cursor-not-allowed"
                }`}
              >
                <item.icon className="mr-3" size={16} />
                {item.name}
              </button>
            ))}
          </nav>
        </div>

        <SettingsForm user={{ name: user.name, email: user.email }} />
      </div>
    </div>
  )
}