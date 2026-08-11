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

  // SELECTION (task 5 — bulk operations)
  selectedTaskIds: Set<string>
  toggleTaskSelection: (taskId: string) => void
  selectTasks: (taskIds: string[]) => void
  clearSelection: () => void

  // BULK MUTATIONS — optimistic counterparts to the single-task actions
  // above, applied from useTasks().bulkUpdateTasks / bulkDeleteTasks.
  bulkUpdateTasks: (taskIds: string[], updates: Partial<TaskWithLabels>) => void
  bulkRemoveTasks: (taskIds: string[]) => void
}

export const useBoardStore = create<BoardState>((set) => ({
  lists: [],
  selectedTaskIds: new Set(),

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
    set((state) => {
      // also drop it from the current selection so a deleted task can't
      // linger as "selected" for a subsequent bulk action
      const selectedTaskIds = new Set(state.selectedTaskIds)
      selectedTaskIds.delete(taskId)
      return {
        selectedTaskIds,
        lists: state.lists.map((l) => ({
          ...l,
          tasks: l.tasks.filter((t) => t.id !== taskId),
        })),
      }
    }),

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

  // SELECTION

  toggleTaskSelection: (taskId) =>
    set((state) => {
      const selectedTaskIds = new Set(state.selectedTaskIds)
      if (selectedTaskIds.has(taskId)) {
        selectedTaskIds.delete(taskId)
      } else {
        selectedTaskIds.add(taskId)
      }
      return { selectedTaskIds }
    }),

  selectTasks: (taskIds) => set({ selectedTaskIds: new Set(taskIds) }),

  clearSelection: () => set({ selectedTaskIds: new Set() }),

  // BULK MUTATIONS

  bulkUpdateTasks: (taskIds, updates) =>
    set((state) => {
      const idSet = new Set(taskIds)
      const { listId: destListId, ...fields } = updates

      // no column change -> plain field merge, same shape as `updateTask`
      if (!destListId) {
        return {
          lists: state.lists.map((l) => ({
            ...l,
            tasks: l.tasks.map((t) => (idSet.has(t.id) ? { ...t, ...fields } : t)),
          })),
        }
      }

      // column change -> pull the selected tasks out of wherever they
      // currently live and append them (in selection order) to the
      // destination list, mirroring what `moveTask` does for a single task
      const moved: TaskWithLabels[] = []
      const stripped = state.lists.map((l) => {
        const keep: TaskWithLabels[] = []
        for (const t of l.tasks) {
          if (idSet.has(t.id)) {
            moved.push({ ...t, ...fields, listId: destListId })
          } else {
            keep.push(t)
          }
        }
        return { ...l, tasks: keep }
      })

      return {
        lists: stripped.map((l) =>
          l.id === destListId ? { ...l, tasks: [...l.tasks, ...moved] } : l
        ),
      }
    }),

  bulkRemoveTasks: (taskIds) =>
    set((state) => {
      const idSet = new Set(taskIds)
      const selectedTaskIds = new Set(state.selectedTaskIds)
      for (const id of taskIds) selectedTaskIds.delete(id)
      return {
        selectedTaskIds,
        lists: state.lists.map((l) => ({
          ...l,
          tasks: l.tasks.filter((t) => !idSet.has(t.id)),
        })),
      }
    }),
}))