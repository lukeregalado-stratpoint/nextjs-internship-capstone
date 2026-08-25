"use client"

import { useState, useTransition } from "react"
import { updateProfileAction } from "@/lib/actions/users"

export function SettingsForm({ user }: { user: { name: string; email: string } }) {
  const [name, setName] = useState(user.name)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const dirty = name.trim() !== user.name
  const canSave = dirty && name.trim().length > 0 && !isPending

  function handleSave() {
    if (!canSave) return
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateProfileAction({ name })
      if (!result.success) {
        setError(result.error)
        return
      }
      setName(result.data.name)
      setSaved(true)
    })
  }

  function handleCancel() {
    setName(user.name)
    setError(null)
    setSaved(false)
  }

  return (
    <div className="lg:col-span-2 space-y-6">
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground dark:text-paper mb-6">Profile Settings</h3>

        <div className="space-y-6">
          <div>
            <label htmlFor="full-name" className="block text-sm font-medium text-foreground dark:text-paper mb-2">
              Full Name
            </label>
            <input
              id="full-name"
              type="text"
              value={name}
              onChange={(e) => {
                setSaved(false)
                setName(e.target.value)
              }}
              className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground dark:text-paper focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground dark:text-paper mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={user.email}
              disabled
              className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Managed through your sign-in provider — use the account menu to change it.
            </p>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {saved && !error && <p className="text-sm text-green-600 dark:text-green-400">Saved.</p>}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={!dirty || isPending}
              className="px-4 py-2 text-muted-foreground dark:text-paper/60 hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}