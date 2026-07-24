import { create } from "zustand"
import type { List, Task } from "@/lib/db/schema"

export type ListWithTasks = List & { tasks: Task[] }

interface BoardState {
  lists: ListWithTasks[]
  setLists: (lists: ListWithTasks[]) => void
  reorder: (orderedIds: string[]) => void
  addList: (list: List) => void
  renameList: (id: string, name: string) => void
  removeList: (id: string) => void
}

export const useBoardStore = create<BoardState>((set) => ({
  lists: [],

  setLists: (lists) => set({ lists }),

  reorder: (orderedIds) =>
    set((state) => {
      const byId = new Map(state.lists.map((l) => [l.id, l]))
      const reordered = orderedIds
        .map((id) => byId.get(id))
        .filter((l): l is ListWithTasks => Boolean(l))
        .map((l, index) => ({ ...l, position: index }))
      return { lists: reordered }
    }),

  addList: (list) =>
    set((state) => ({ lists: [...state.lists, { ...list, tasks: [] }] })),

  renameList: (id, name) =>
    set((state) => ({
      lists: state.lists.map((l) => (l.id === id ? { ...l, name } : l)),
    })),

  removeList: (id) =>
    set((state) => ({ lists: state.lists.filter((l) => l.id !== id) })),
}))
