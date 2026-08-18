"use client"

import { create, type StateCreator } from "zustand"
import { persist, type PersistOptions } from "zustand/middleware"

export type RecentPaletteItem = {
  id: string
  label: string
  sublabel?: string
  href: string
}

interface CommandPaletteUIState {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

/**
 * Open/close state only — deliberately NOT persisted. `isOpen: true`
 * surviving a page reload from stale localStorage would pop the palette
 * open on every visit, which is worse than just defaulting closed.
 */
export const useCommandPaletteStore = create<CommandPaletteUIState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}))

interface RecentItemsState {
  recentItems: RecentPaletteItem[]
  addRecentItem: (item: RecentPaletteItem) => void
}

const MAX_RECENT_ITEMS = 5

const recentItemsCreator: StateCreator<RecentItemsState> = (set) => ({
  recentItems: [],
  addRecentItem: (item) =>
    set((s) => ({
      recentItems: [
        item,
        ...s.recentItems.filter((existing) => existing.id !== item.id),
      ].slice(0, MAX_RECENT_ITEMS),
    })),
})

const recentItemsPersistOptions: PersistOptions<RecentItemsState> = {
  name: "command-palette-recent",
}

/**
 * Kept in its own store, separate from `useCommandPaletteStore`, so
 * there's nothing here that shouldn't be persisted (no `partialize`
 * needed). The creator and options are pulled out into explicitly-typed
 * consts above (rather than written inline inside `persist(...)`) as a
 * workaround for a TS inference issue on some zustand + tsconfig
 * combinations, where `'zustand/persist'` fails to structurally match the
 * `StoreMutators` augmentation and TS reports it as not assignable to
 * `never`. Writing it this way sidesteps that without needing to touch
 * tsconfig's `moduleResolution`.
 */
export const useRecentPaletteItems = create<RecentItemsState>()(
  persist(recentItemsCreator, recentItemsPersistOptions)
)