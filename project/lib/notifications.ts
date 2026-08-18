import { EventEmitter } from "node:events"
import { createNotification } from "@/lib/db/queries"
import type { NewNotification, Notification } from "@/lib/db/schema"

// A single process-wide emitter, one "channel" per recipient (`user:<id>`).
// Stashed on globalThis so Next.js's dev-mode module reloading doesn't spin
// up a fresh emitter (and drop connected SSE listeners) on every edit.
//
// IMPORTANT: this only fans out to SSE connections held open by *this*
// server process. Fine for local dev or a single long-running instance. On
// a multi-instance/serverless deployment (e.g. Vercel), a client connected
// to instance A won't hear about a notification created on instance B —
// swap this for real pub/sub (Postgres LISTEN/NOTIFY, Redis, Ably) before
// relying on it there. The initial fetch in useNotifications() still shows
// the notification on next page load either way, so nothing is lost — it
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
 * connection(s), if any. Same "best-effort, non-fatal" spirit as the
 * activity-logging helpers in queries.ts — callers wrap this in try/catch
 * (see lib/actions/tasks.ts) so a failure here never blocks or rolls back
 * whatever action triggered it.
 */
export async function notifyUser(data: NewNotification) {
  const notification = await createNotification(data)
  notificationEmitter.emit(channelFor(data.recipientId), notification)
  return notification
}