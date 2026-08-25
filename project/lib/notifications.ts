import { EventEmitter } from "node:events"
import { createNotification, isNotificationTypeEnabled } from "@/lib/db/queries"
import type { NewNotification, Notification } from "@/lib/db/schema"

// a single process-wide emitter, one "channel" per recipient (`user:<id>`).
// stashed on globalthis so next.js's dev-mode module reloading doesn't spin
// up a fresh emitter (and drop connected sse listeners) on every edit.
//
// important: this only fans out to sse connections held open by *this*
// server process. fine for local dev or a single long-running instance. on
// a multi-instance/serverless deployment (e.g. vercel), a client connected
// to instance a won't hear about a notification created on instance b -
// swap this for real pub/sub (postgres listen/notify, redis, ably) before
// relying on it there. the initial fetch in usenotifications() still shows
// the notification on next page load either way, so nothing is lost - it
// just won't arrive live in that scenario.
const globalForEmitter = globalThis as unknown as { notificationEmitter?: EventEmitter }

export const notificationEmitter = globalForEmitter.notificationEmitter ?? new EventEmitter()
notificationEmitter.setMaxListeners(0)

if (process.env.NODE_ENV !== "production") {
  globalForEmitter.notificationEmitter = notificationEmitter
}

function channelFor(userId: string) {
  return `user:${userId}`
}

export function subscribeToNotifications(
  userId: string,
  onNotification: (n: Notification) => void
) {
  const channel = channelFor(userId)
  notificationEmitter.on(channel, onNotification)
  return () => notificationEmitter.off(channel, onNotification)
}

/**
 * Creates a notification row and pushes it live to the recipient's open SSE
 * connection(s), if any. Returns null (no row created, nothing emitted) if
 * the recipient has disabled this notification type in their preferences.
 * Same "best-effort, non-fatal" spirit as before - callers wrap this in
 * try/catch and shouldn't assume a non-null return.
 */
export async function notifyUser(data: NewNotification): Promise<Notification | null> {
  const enabled = await isNotificationTypeEnabled(data.recipientId, data.type)
  if (!enabled) return null

  const notification = await createNotification(data)
  notificationEmitter.emit(channelFor(data.recipientId), notification)
  return notification
}