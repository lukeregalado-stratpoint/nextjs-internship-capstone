"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/theme-provider"

const THEME_OPTIONS = [
  { value: "light" as const, label: "Light", icon: Sun },
  { value: "dark" as const, label: "Dark", icon: Moon },
]

export function AppearanceForm() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="lg:col-span-2 space-y-6">
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground dark:text-paper mb-1">Appearance</h3>
        <p className="text-sm text-muted-foreground mb-6">
          choose how the app looks on this device. this is saved to your browser, not synced to your account
        </p>

        <div className="grid grid-cols-2 gap-3 max-w-sm">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              aria-pressed={theme === option.value}
              className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors ${
                theme === option.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-foreground/70 dark:text-paper/70 hover:bg-muted"
              }`}
            >
              <option.icon size={20} />
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}