import { create } from "zustand"
import type { Label, List, Task } from "@/lib/db/schema"

export type TaskWithLabels = Task & { labels: Label[] }
export type ListWithTasks = List & { tasks: TaskWithLabels[] }

interface BoardState {
  lists: ListWithTasks[]
  setLists: (lists: ListWithTasks[]) => void
  reorder: (orderedIds: string[]) => void
  addList: (list: List) => void
  renameList: (id: string, name: string) => void
  removeList: (id: string) => void
  addTask: (listId: string, task: TaskWithLabels) => void
  updateTask: (taskId: string, updates: Partial<TaskWithLabels>) => void
  removeTask: (taskId: string) => void
  moveTask: (taskId: string, destListId: string, destIndex?: number) => void
  reorderTasksInList: (listId: string, orderedTaskIds: string[]) => void
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

  addTask: (listId, task) =>
    set((state) => ({
      lists: state.lists.map((l) =>
        l.id === listId ? { ...l, tasks: [...l.tasks, task] } : l
      ),
    })),

  // In-place field update only — does NOT move the task between lists.
  // Use `moveTask` for that (kept separate so a listId change can't be
  // applied to the wrong list's task array by accident).
  updateTask: (taskId, updates) =>
    set((state) => ({
      lists: state.lists.map((l) => ({
        ...l,
        tasks: l.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
      })),
    })),

  removeTask: (taskId) =>
    set((state) => ({
      lists: state.lists.map((l) => ({
        ...l,
        tasks: l.tasks.filter((t) => t.id !== taskId),
      })),
    })),

  moveTask: (taskId, destListId, destIndex) =>
    set((state) => {
      let movedTask: TaskWithLabels | undefined
      const stripped = state.lists.map((l) => {
        const found = l.tasks.find((t) => t.id === taskId)
        if (found) movedTask = found
        return { ...l, tasks: l.tasks.filter((t) => t.id !== taskId) }
      })

      if (!movedTask) return { lists: stripped }

      const relocated = { ...movedTask, listId: destListId }
      return {
        lists: stripped.map((l) => {
          if (l.id !== destListId) return l
          const tasks = [...l.tasks]
          const insertAt = destIndex === undefined ? tasks.length : destIndex
          tasks.splice(insertAt, 0, relocated)
          return { ...l, tasks }
        }),
      }
    }),

  reorderTasksInList: (listId, orderedTaskIds) =>
    set((state) => ({
      lists: state.lists.map((l) => {
        if (l.id !== listId) return l
        const byId = new Map(l.tasks.map((t) => [t.id, t]))
        const reordered = orderedTaskIds
          .map((id) => byId.get(id))
          .filter((t): t is TaskWithLabels => Boolean(t))
        return { ...l, tasks: reordered }
      }),
    })),
}))