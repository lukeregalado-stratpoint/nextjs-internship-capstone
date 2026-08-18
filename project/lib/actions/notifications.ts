"use server"

import { requireUser } from "@/lib/auth"
import {
  getNotificationsForUser,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  ownsNotification,
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