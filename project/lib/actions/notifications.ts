"use server"

import { requireUser } from "@/lib/auth"
import {
  getNotificationPreferences,
  getNotificationsForUser,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  ownsNotification,
  upsertNotificationPreferences,
} from "@/lib/db/queries"

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

export async function getNotificationsAction(): Promise<
  ActionResult<{
    notifications: Awaited<ReturnType<typeof getNotificationsForUser>>
    unreadCount: number
  }>
> {
  const user = await requireUser()
  const [notifications, unreadCount] = await Promise.all([
    getNotificationsForUser(user.id),
    getUnreadNotificationCount(user.id),
  ])
  return { success: true, data: { notifications, unreadCount } }
}

export async function markNotificationReadAction(
  notificationId: string
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()

  const owns = await ownsNotification(notificationId, user.id)
  if (!owns) {
    return { success: false, error: "You don't have permission to update this notification" }
  }

  await markNotificationRead(notificationId)
  return { success: true, data: { id: notificationId } }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult<{ ok: true }>> {
  const user = await requireUser()
  await markAllNotificationsRead(user.id)
  return { success: true, data: { ok: true } }
}

export type NotificationPreferencesPayload = {
  taskAssigned: boolean
  commentAdded: boolean
  dueDateReminder: boolean
}

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferencesPayload = {
  taskAssigned: true,
  commentAdded: true,
  dueDateReminder: true,
}

export async function getNotificationPreferencesAction(): Promise<
  ActionResult<NotificationPreferencesPayload>
> {
  const user = await requireUser()
  const prefs = await getNotificationPreferences(user.id)
  if (!prefs) return { success: true, data: DEFAULT_NOTIFICATION_PREFERENCES }
  return {
    success: true,
    data: {
      taskAssigned: prefs.taskAssigned,
      commentAdded: prefs.commentAdded,
      dueDateReminder: prefs.dueDateReminder,
    },
  }
}

export async function updateNotificationPreferencesAction(
  updates: Partial<NotificationPreferencesPayload>
): Promise<ActionResult<NotificationPreferencesPayload>> {
  const user = await requireUser()
  const prefs = await upsertNotificationPreferences(user.id, updates)
  return {
    success: true,
    data: {
      taskAssigned: prefs.taskAssigned,
      commentAdded: prefs.commentAdded,
      dueDateReminder: prefs.dueDateReminder,
    },
  }
}