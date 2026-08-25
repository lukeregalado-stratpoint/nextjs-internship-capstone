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

  // selection (task 5, bulk operations)
  selectedTaskIds: Set<string>
  toggleTaskSelection: (taskId: string) => void
  selectTasks: (taskIds: string[]) => void
  clearSelection: () => void

  // bulk mutations, optimistic counterparts to the single-task actions
  // above. applied from useTasks().bulkUpdateTasks / bulkDeleteTasks.
  bulkUpdateTasks: (taskIds: string[], updates: Partial<TaskWithLabels>) => void
  bulkRemoveTasks: (taskIds: string[]) => void

  // pending state, granular in-flight tracking so components can show a
  // loading spinner on just the thing that's saving, not a blanket
  // "something on the board is loading" flag. plain Sets instead of
  // useTransition because one shared transition per hook can't tell you
  // which task or list actually triggered it.
  pendingTaskIds: Set<string>
  setTaskPending: (taskId: string, pending: boolean) => void
  pendingListIds: Set<string>
  setListPending: (listId: string, pending: boolean) => void
}

export const useBoardStore = create<BoardState>((set) => ({
  lists: [],
  selectedTaskIds: new Set(),
  pendingTaskIds: new Set(),
  pendingListIds: new Set(),

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

  // in-place field update only, does not move the task between lists.
  // use `moveTask` for that (kept separate so a listId change can't
  // accidentally get applied to the wrong list's task array).
  //
  // only the one list that actually contains `taskId` gets a new object
  // reference, every other list passes through untouched, so
  // React.memo(BoardColumn) can skip re-rendering the other columns.
  updateTask: (taskId, updates) =>
    set((state) => {
      const listIndex = state.lists.findIndex((l) => l.tasks.some((t) => t.id === taskId))
      if (listIndex === -1) return state

      const list = state.lists[listIndex]
      const lists = [...state.lists]
      lists[listIndex] = {
        ...list,
        tasks: list.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
      }
      return { lists }
    }),

  removeTask: (taskId) =>
    set((state) => {
      // also drop it from the current selection so a deleted task doesn't
      // linger as "selected" for whatever bulk action runs next
      const selectedTaskIds = new Set(state.selectedTaskIds)
      selectedTaskIds.delete(taskId)

      const listIndex = state.lists.findIndex((l) => l.tasks.some((t) => t.id === taskId))
      if (listIndex === -1) return { selectedTaskIds }

      const list = state.lists[listIndex]
      const lists = [...state.lists]
      lists[listIndex] = { ...list, tasks: list.tasks.filter((t) => t.id !== taskId) }
      return { selectedTaskIds, lists }
    }),

  // touches at most two lists (source and destination), or just one if
  // it's a same-list reorder. every uninvolved list keeps its reference.
  moveTask: (taskId, destListId, destIndex) =>
    set((state) => {
      const srcListIndex = state.lists.findIndex((l) => l.tasks.some((t) => t.id === taskId))
      if (srcListIndex === -1) return state

      const srcList = state.lists[srcListIndex]
      const movedTask = srcList.tasks.find((t) => t.id === taskId)
      if (!movedTask) return state
      const relocated = { ...movedTask, listId: destListId }

      // same-list reorder, only that one list changes
      if (srcList.id === destListId) {
        const tasks = srcList.tasks.filter((t) => t.id !== taskId)
        const insertAt = destIndex === undefined ? tasks.length : destIndex
        tasks.splice(insertAt, 0, relocated)
        const lists = [...state.lists]
        lists[srcListIndex] = { ...srcList, tasks }
        return { lists }
      }

      const lists = [...state.lists]
      lists[srcListIndex] = { ...srcList, tasks: srcList.tasks.filter((t) => t.id !== taskId) }

      const destListIndex = lists.findIndex((l) => l.id === destListId)
      if (destListIndex !== -1) {
        const destList = lists[destListIndex]
        const tasks = [...destList.tasks]
        const insertAt = destIndex === undefined ? tasks.length : destIndex
        tasks.splice(insertAt, 0, relocated)
        lists[destListIndex] = { ...destList, tasks }
      }

      return { lists }
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

  // selection

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

  // bulk mutations

  bulkUpdateTasks: (taskIds, updates) =>
    set((state) => {
      const idSet = new Set(taskIds)
      const { listId: destListId, ...fields } = updates

      // no column change -> plain field merge, same shape as `updateTask`.
      // skip any list that doesn't contain a selected task at all.
      if (!destListId) {
        let changed = false
        const lists = state.lists.map((l) => {
          if (!l.tasks.some((t) => idSet.has(t.id))) return l
          changed = true
          return {
            ...l,
            tasks: l.tasks.map((t) => (idSet.has(t.id) ? { ...t, ...fields } : t)),
          }
        })
        return changed ? { lists } : state
      }

      // column change -> only lists that actually hold a selected task
      // (sources losing tasks, plus the destination) get rebuilt.
      // everything else passes through by reference, same as `moveTask`.
      const touchedListIds = new Set(
        state.lists.filter((l) => l.tasks.some((t) => idSet.has(t.id))).map((l) => l.id)
      )
      touchedListIds.add(destListId)

      const moved: TaskWithLabels[] = []
      const lists = state.lists.map((l) => {
        if (!touchedListIds.has(l.id)) return l
        const keep = l.tasks.filter((t) => !idSet.has(t.id))
        for (const t of l.tasks) {
          if (idSet.has(t.id)) moved.push({ ...t, ...fields, listId: destListId })
        }
        return { ...l, tasks: keep }
      })

      return {
        lists: lists.map((l) =>
          l.id === destListId ? { ...l, tasks: [...l.tasks, ...moved] } : l
        ),
      }
    }),

  bulkRemoveTasks: (taskIds) =>
    set((state) => {
      const idSet = new Set(taskIds)
      const selectedTaskIds = new Set(state.selectedTaskIds)
      for (const id of taskIds) selectedTaskIds.delete(id)

      let changed = false
      const lists = state.lists.map((l) => {
        if (!l.tasks.some((t) => idSet.has(t.id))) return l
        changed = true
        return { ...l, tasks: l.tasks.filter((t) => !idSet.has(t.id)) }
      })
      return changed ? { selectedTaskIds, lists } : { selectedTaskIds }
    }),

  // pending state

  setTaskPending: (taskId, pending) =>
    set((state) => {
      if (pending === state.pendingTaskIds.has(taskId)) return state
      const pendingTaskIds = new Set(state.pendingTaskIds)
      if (pending) pendingTaskIds.add(taskId)
      else pendingTaskIds.delete(taskId)
      return { pendingTaskIds }
    }),

  setListPending: (listId, pending) =>
    set((state) => {
      if (pending === state.pendingListIds.has(listId)) return state
      const pendingListIds = new Set(state.pendingListIds)
      if (pending) pendingListIds.add(listId)
      else pendingListIds.delete(listId)
      return { pendingListIds }
    }),
}))