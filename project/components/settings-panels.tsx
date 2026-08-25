"use client"

import { useState } from "react"
import { User, Bell, Shield, Palette } from "lucide-react"
import { SettingsForm } from "@/components/settings-form"
import { AppearanceForm } from "@/components/appearance-form"
import { NotificationPreferencesForm } from "@/components/notifications-preferences-form"

type SettingsTab = "profile" | "appearance" | "notifications"

const TABS: { id: SettingsTab; name: string; icon: typeof User }[] = [
  { id: "profile", name: "Profile", icon: User },
  { id: "appearance", name: "Appearance", icon: Palette },
  { id: "notifications", name: "Notifications", icon: Bell },
]

export function SettingsPanels({ user }: { user: { name: string; email: string } }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile")

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground dark:text-paper mb-4">Settings</h3>
        <nav className="space-y-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/70 dark:text-paper/70 hover:bg-muted"
              }`}
            >
              <tab.icon className="mr-3" size={16} />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "profile" && <SettingsForm user={user} />}
      {activeTab === "appearance" && <AppearanceForm />}
      {activeTab === "notifications" && <NotificationPreferencesForm />}
    </div>
  )
}