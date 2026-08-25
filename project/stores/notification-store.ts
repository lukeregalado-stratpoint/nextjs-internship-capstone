import { create } from "zustand"
import type { NotificationWithInvitationStatus } from "@/lib/db/queries"

type AppNotification = NotificationWithInvitationStatus

interface NotificationState {
  notifications: AppNotification[]
  unreadCount: number
  isOpen: boolean
  setNotifications: (notifications: AppNotification[], unreadCount: number) => void
  addNotification: (notification: AppNotification) => void
  markRead: (id: string) => void
  markAllRead: () => void
  // called right after accept/decline succeeds, so the buttons update
  // immediately instead of waiting on the next sse event or a refresh
  setInvitationStatus: (projectId: string, status: "accepted" | "declined") => void
  toggleOpen: () => void
  setOpen: (open: boolean) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,

  setNotifications: (notifications, unreadCount) => set({ notifications, unreadCount }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 30),
      unreadCount: state.unreadCount + 1,
    })),

  markRead: (id) =>
    set((state) => {
      const target = state.notifications.find((n) => n.id === id)
      if (!target || target.readAt) return state
      return {
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, readAt: new Date() } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }
    }),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => (n.readAt ? n : { ...n, readAt: new Date() })),
      unreadCount: 0,
    })),

  setInvitationStatus: (projectId, status) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.type === "project_invitation" && n.projectId === projectId
          ? { ...n, invitationStatus: status }
          : n
      ),
    })),

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  setOpen: (open) => set({ isOpen: open }),
}))