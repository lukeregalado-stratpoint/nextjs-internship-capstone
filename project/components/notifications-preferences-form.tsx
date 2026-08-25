"use client"

import { useEffect, useState } from "react"
import {
  getNotificationPreferencesAction,
  updateNotificationPreferencesAction,
  type NotificationPreferencesPayload,
} from "@/lib/actions/notifications"

const NOTIFICATION_TOGGLES: {
  key: keyof NotificationPreferencesPayload
  label: string
  description: string
}[] = [
  {
    key: "taskAssigned",
    label: "Task assigned",
    description: "When someone assigns a task to you",
  },
  {
    key: "commentAdded",
    label: "Comments",
    description: "When someone comments on one of your tasks",
  },
  {
    key: "dueDateReminder",
    label: "Due date reminders",
    description: "When a task assigned to you is coming up on its due date",
  },
]

function ToggleSwitch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean
  onChange: () => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? "bg-primary" : "bg-muted"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  )
}

export function NotificationPreferencesForm() {
  const [prefs, setPrefs] = useState<NotificationPreferencesPayload | null>(null)
  const [pendingKey, setPendingKey] = useState<keyof NotificationPreferencesPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getNotificationPreferencesAction().then((result) => {
      if (result.success) setPrefs(result.data)
    })
  }, [])

  function handleToggle(key: keyof NotificationPreferencesPayload) {
    if (!prefs || pendingKey) return

    const next = { ...prefs, [key]: !prefs[key] }
    const previous = prefs
    setError(null)
    // update the switch right away, revert it below if the save fails
    setPrefs(next)
    setPendingKey(key)

    updateNotificationPreferencesAction({ [key]: next[key] }).then((result) => {
      setPendingKey(null)
      if (!result.success) {
        setPrefs(previous)
        setError(result.error)
        return
      }
      setPrefs(result.data)
    })
  }

  return (
    <div className="lg:col-span-2 space-y-6">
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground dark:text-paper mb-1">Notifications</h3>
        <p className="text-sm text-muted-foreground mb-6">Choose what you want to be notified about.</p>

        {!prefs ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-4">
            {NOTIFICATION_TOGGLES.map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground dark:text-paper">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <ToggleSwitch
                  checked={prefs[key]}
                  onChange={() => handleToggle(key)}
                  disabled={pendingKey !== null}
                  label={label}
                />
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400 mt-4">{error}</p>}
      </div>
    </div>
  )
}