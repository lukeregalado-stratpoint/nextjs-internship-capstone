import { create } from "zustand"
import type { Task, Label } from "@/lib/db/schema"

export type TaskWithLabels = Task & { labels: Label[] }
export type ListWithTasks = { id: string; name: string; tasks: TaskWithLabels[] }

interface BoardState {
  lists: ListWithTasks[]
  pendingTaskIds: Set<string>
  selectedTaskIds: Set<string>
  setLists: (lists: ListWithTasks[]) => void
  addTask: (listId: string, task: TaskWithLabels) => void
  updateTask: (taskId: string, fields: Partial<TaskWithLabels>) => void
  removeTask: (taskId: string) => void
  moveTask: (taskId: string, destListId: string, index?: number) => void
  reorderTasksInList: (listId: string, orderedIds: string[]) => void
  bulkUpdateTasks: (
    taskIds: string[],
    fields: { listId?: string; priority?: Task["priority"]; assigneeId?: string | null }
  ) => void
  bulkRemoveTasks: (taskIds: string[]) => void
  setTaskPending: (taskId: string, pending: boolean) => void
  toggleTaskSelection: (taskId: string) => void
  selectTasks: (taskIds: string[]) => void
  clearSelection: () => void
}

/**
 * A real (not vi.fn()-mocked) zustand store, purpose-built to satisfy the
 * subset of the board-store contract that use-tasks.ts and kanban-board.tsx
 * actually call. Using a real store — rather than stubbing every method —
 * means optimistic-update and rollback tests exercise genuine state
 * transitions instead of just asserting "was called".
 *
 * The real /stores/board-store.ts wasn't available at the time these tests
 * were written; if its actual field/action names differ, update this file
 * to match rather than the tests themselves.
 */
export function createTestBoardStore() {
  return create<BoardState>((set, get) => ({
    lists: [],
    pendingTaskIds: new Set(),
    selectedTaskIds: new Set(),
    setLists: (lists) => set({ lists }),
    addTask: (listId, task) =>
      set((s) => ({
        lists: s.lists.map((l) => (l.id === listId ? { ...l, tasks: [...l.tasks, task] } : l)),
      })),
    updateTask: (taskId, fields) =>
      set((s) => ({
        lists: s.lists.map((l) => ({
          ...l,
          tasks: l.tasks.map((t) => (t.id === taskId ? { ...t, ...fields } : t)),
        })),
      })),
    removeTask: (taskId) =>
      set((s) => ({
        lists: s.lists.map((l) => ({ ...l, tasks: l.tasks.filter((t) => t.id !== taskId) })),
      })),
    moveTask: (taskId, destListId) =>
      set((s) => {
        let moved: TaskWithLabels | undefined
        const stripped = s.lists.map((l) => {
          const found = l.tasks.find((t) => t.id === taskId)
          if (found) moved = found
          return { ...l, tasks: l.tasks.filter((t) => t.id !== taskId) }
        })
        if (!moved) return s
        return {
          lists: stripped.map((l) =>
            l.id === destListId ? { ...l, tasks: [...l.tasks, { ...moved!, listId: destListId }] } : l
          ),
        }
      }),
    reorderTasksInList: (listId, orderedIds) =>
      set((s) => ({
        lists: s.lists.map((l) => {
          if (l.id !== listId) return l
          const byId = new Map(l.tasks.map((t) => [t.id, t]))
          return { ...l, tasks: orderedIds.map((id) => byId.get(id)!).filter(Boolean) }
        }),
      })),
    bulkUpdateTasks: (taskIds, fields) =>
      set((s) => ({
        lists: s.lists.map((l) => ({
          ...l,
          tasks: l.tasks.map((t) => (taskIds.includes(t.id) ? { ...t, ...fields } : t)),
        })),
      })),
    bulkRemoveTasks: (taskIds) =>
      set((s) => ({
        lists: s.lists.map((l) => ({ ...l, tasks: l.tasks.filter((t) => !taskIds.includes(t.id)) })),
      })),
    setTaskPending: (taskId, pending) =>
      set((s) => {
        const next = new Set(s.pendingTaskIds)
        pending ? next.add(taskId) : next.delete(taskId)
        return { pendingTaskIds: next }
      }),
    toggleTaskSelection: (taskId) =>
      set((s) => {
        const next = new Set(s.selectedTaskIds)
        next.has(taskId) ? next.delete(taskId) : next.add(taskId)
        return { selectedTaskIds: next }
      }),
    selectTasks: (taskIds) => set({ selectedTaskIds: new Set(taskIds) }),
    clearSelection: () => set({ selectedTaskIds: new Set() }),
  }))
  // Note: zustand's `create()` already attaches `.getState()` / `.setState()`
  // / `.subscribe()` to the returned hook itself — use-tasks.ts relies on
  // `useBoardStore.getState()`, which works automatically here.
}
