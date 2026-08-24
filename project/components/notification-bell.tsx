"use client"

import Link from "next/link"
import { Bell, Check } from "lucide-react"
import { useNotifications } from "@/hooks/use-notifications"
import { useInvitations } from "@/hooks/use-invitations"
import { useNotificationStore } from "@/stores/notification-store"
import type { NotificationWithInvitationStatus as AppNotification } from "@/lib/db/queries"

function notificationHref(n: AppNotification) {
  if (n.taskId && n.projectId) return `/projects/${n.projectId}?task=${n.taskId}`
  if (n.projectId) return `/projects/${n.projectId}`
  return "/dashboard"
}

function timeAgo(date: Date | string) {
  const diffMs = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function NotificationBell({
  dropdownPosition = "bottom",
}: {
  dropdownPosition?: "top" | "bottom"
}) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const { acceptInvitationForProject, declineInvitationForProject, isPending: isRespondingToInvite } =
    useInvitations()
  const isOpen = useNotificationStore((s) => s.isOpen)
  const toggleOpen = useNotificationStore((s) => s.toggleOpen)
  const setOpen = useNotificationStore((s) => s.setOpen)
  const setInvitationStatus = useNotificationStore((s) => s.setInvitationStatus)

  // invitationStatus comes from project_invitations itself (see
  // getNotificationsForUser), so it survives a refresh instead of resetting
  // like local component state would. setInvitationStatus updates the store
  // right away so the buttons swap out without waiting on a refetch.
  function handleAccept(n: AppNotification) {
    if (!n.projectId) return
    acceptInvitationForProject(n.projectId, () => {
      setInvitationStatus(n.projectId!, "accepted")
      if (!n.readAt) markRead(n.id)
    })
  }

  function handleDecline(n: AppNotification) {
    if (!n.projectId) return
    declineInvitationForProject(n.projectId, () => {
      setInvitationStatus(n.projectId!, "declined")
      if (!n.readAt) markRead(n.id)
    })
  }

  return (
    <div className="relative">
      <button
        onClick={toggleOpen}
        className="relative p-2 rounded-md text-slate dark:text-slate-dark hover:bg-paper dark:hover:bg-paper-dark transition-colors"
        aria-label="Notifications"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-primary text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={`absolute ${
              dropdownPosition === "bottom" ? "bottom-full mb-2" : "top-full mt-2"
            } left-0 z-50 w-80 max-h-96 overflow-y-auto rounded-lg border border-line dark:border-line-dark bg-surface dark:bg-surface-dark shadow-lg`}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-line dark:border-line-dark">
              <span className="text-sm font-medium text-ink dark:text-paper">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Check size={12} />
                  Mark all read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-slate dark:text-slate-dark">
                You&apos;re all caught up.
              </p>
            ) : (
              <ul className="divide-y divide-line dark:divide-line-dark">
                {notifications.map((n) => {
                  const responded =
                    n.type === "project_invitation" && n.invitationStatus !== "pending"
                      ? n.invitationStatus
                      : null
                  const isPendingInvite = n.type === "project_invitation" && n.invitationStatus === "pending"

                  const body = (
                    <div className="flex items-start gap-2">
                      {!n.readAt && (
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      )}
                      <div className={n.readAt ? "pl-3.5" : ""}>
                        <p className="text-sm text-ink dark:text-paper">{n.title}</p>
                        {n.body && (
                          <p className="text-xs text-slate dark:text-slate-dark mt-0.5">{n.body}</p>
                        )}
                        <p className="text-[11px] text-slate dark:text-slate-dark mt-1">
                          {timeAgo(n.createdAt)}
                        </p>

                        {isPendingInvite && (
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleAccept(n)
                              }}
                              disabled={isRespondingToInvite}
                              className="px-2.5 py-1 text-xs font-medium rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleDecline(n)
                              }}
                              disabled={isRespondingToInvite}
                              className="px-2.5 py-1 text-xs font-medium rounded-md border border-line dark:border-line-dark text-slate dark:text-slate-dark hover:bg-paper dark:hover:bg-paper-dark disabled:opacity-50 transition-colors"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                        {responded && (
                          <p className="mt-1.5 text-[11px] font-medium text-slate dark:text-slate-dark">
                            {responded === "accepted" ? "Invitation accepted" : "Invitation declined"}
                          </p>
                        )}
                      </div>
                    </div>
                  )

                  const rowClassName = `block px-3 py-2.5 transition-colors ${
                    n.readAt ? "" : "bg-primary/5"
                  } ${isPendingInvite ? "" : "hover:bg-paper dark:hover:bg-paper-dark"}`

                  // A pending invitation isn't "go look at this" like other
                  // notification types — it needs an explicit Accept/Decline,
                  // so it renders as a plain row instead of a navigating Link.
                  if (isPendingInvite) {
                    return (
                      <li key={n.id} className={rowClassName}>
                        {body}
                      </li>
                    )
                  }

                  return (
                    <li key={n.id}>
                      <Link
                        href={notificationHref(n)}
                        onClick={() => {
                          if (!n.readAt) markRead(n.id)
                          setOpen(false)
                        }}
                        className={`${rowClassName} hover:bg-paper dark:hover:bg-paper-dark`}
                      >
                        {body}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}