"use client"

import { useEffect, useRef } from "react"
import {
  getNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/actions/notifications"
import { useNotificationStore } from "@/stores/notification-store"
import type { Notification as AppNotification } from "@/lib/db/schema"

/**
 * Loads the initial notification list once on mount, then keeps it live via
 * SSE (app/api/notifications/stream/route.ts). EventSource reconnects on
 * its own after a drop; we don't add extra retry logic on top of it.
 */
export function useNotifications() {
  const setNotifications = useNotificationStore((s) => s.setNotifications)
  const addNotification = useNotificationStore((s) => s.addNotification)
  const markRead = useNotificationStore((s) => s.markRead)
  const markAllRead = useNotificationStore((s) => s.markAllRead)
  const notifications = useNotificationStore((s) => s.notifications)
  const unreadCount = useNotificationStore((s) => s.unreadCount)

  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    getNotificationsAction().then((result) => {
      if (result.success) {
        setNotifications(result.data.notifications, result.data.unreadCount)
      }
    })

    const source = new EventSource("/api/notifications/stream")

    source.addEventListener("notification", (event) => {
      const notification = JSON.parse((event as MessageEvent).data) as AppNotification
      addNotification(notification)
    })

    return () => source.close()
  }, [addNotification, setNotifications])

  const onMarkRead = async (id: string) => {
    markRead(id) // optimistic
    const result = await markNotificationReadAction(id)
    if (!result.success) console.error(result.error)
  }

  const onMarkAllRead = async () => {
    markAllRead() // optimistic
    const result = await markAllNotificationsReadAction()
    if (!result.success) console.error(result.error)
  }

  return { notifications, unreadCount, markRead: onMarkRead, markAllRead: onMarkAllRead }
}