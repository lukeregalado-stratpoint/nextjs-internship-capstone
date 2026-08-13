"use client"

import { useState, useTransition } from "react"
import { useBoardStore, type ListWithTasks, type TaskWithLabels } from "@/stores/board-store"
import {
  bulkDeleteTasksAction,
  bulkUpdateTasksAction,
  createTaskAction,
  deleteTaskAction,
  moveTaskAction,
  updateTaskAction,
} from "@/lib/actions/tasks"
import type { TaskInput, TaskUpdateInput } from "@/lib/validations"
import type { Task } from "@/lib/db/schema"

export function useTasks(projectId: string) {
  const addTaskInStore = useBoardStore((s) => s.addTask)
  const updateTaskInStore = useBoardStore((s) => s.updateTask)
  const removeTaskInStore = useBoardStore((s) => s.removeTask)
  const moveTaskInStore = useBoardStore((s) => s.moveTask)
  const bulkUpdateTasksInStore = useBoardStore((s) => s.bulkUpdateTasks)
  const bulkRemoveTasksInStore = useBoardStore((s) => s.bulkRemoveTasks)
  const setTaskPending = useBoardStore((s) => s.setTaskPending)

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function createTask(input: TaskInput, onSuccess?: (task: TaskWithLabels) => void) {
    setError(null)
    startTransition(async () => {
      const result = await createTaskAction(projectId, input)
      if (!result.success) {
        setError(result.error)
        return
      }
      addTaskInStore(result.data.listId, result.data)
      onSuccess?.(result.data)
    })
  }

  function updateTask(
    taskId: string,
    input: TaskUpdateInput,
    onSuccess?: (task: TaskWithLabels) => void
  ) {
    setError(null)

    // apply immediately (optimistic update)
    const snapshot = useBoardStore.getState().lists
    if (input.listId) moveTaskInStore(taskId, input.listId)
    // `labelIds` isn't a store field (the store holds resolved `labels`
    // objects for rendering) — skip it optimistically and let the
    // confirmed response below fill in the resolved label set.
    const { listId, labelIds, ...fields } = input
    updateTaskInStore(taskId, fields)
    setTaskPending(taskId, true)

    startTransition(async () => {
      try {
        const result = await updateTaskAction(taskId, projectId, input)
        if (!result.success) {
          setError(result.error)
          useBoardStore.getState().setLists(snapshot)
          return
        }
        updateTaskInStore(taskId, result.data)
        onSuccess?.(result.data)
      } finally {
        setTaskPending(taskId, false)
      }
    })
  }

  function deleteTask(taskId: string, onSuccess?: () => void) {
    setError(null)

    const snapshot = useBoardStore.getState().lists
    setTaskPending(taskId, true)
    removeTaskInStore(taskId)

    startTransition(async () => {
      try {
        const result = await deleteTaskAction(taskId, projectId)
        if (!result.success) {
          setError(result.error)
          useBoardStore.getState().setLists(snapshot)
          return
        }
        onSuccess?.()
      } finally {
        setTaskPending(taskId, false)
      }
    })
  }

  /**
   * retains drag + drop result. The task is already sitting in its new
   * column optimistically by the time this is called (board.tsx applies
   * moveTask/reorderTasksInList to the store on drop) — this just confirms
   * with the server, so the card gets a pending indicator until it lands.
   */
  function moveTask(
    taskId: string,
    destListId: string,
    orderedTaskIds: string[],
    rollbackTo: ListWithTasks[]
  ) {
    setError(null)
    setTaskPending(taskId, true)
    startTransition(async () => {
      try {
        const result = await moveTaskAction(projectId, { taskId, destListId, orderedTaskIds })
        if (!result.success) {
          setError(result.error)
          useBoardStore.getState().setLists(rollbackTo)
        }
      } finally {
        setTaskPending(taskId, false)
      }
    })
  }

  /**
   * Bulk delete for the board's multi-select toolbar / Delete-key shortcut.
   */
  function bulkDeleteTasks(taskIds: string[], onSuccess?: () => void) {
    setError(null)

    const snapshot = useBoardStore.getState().lists
    for (const id of taskIds) setTaskPending(id, true)
    bulkRemoveTasksInStore(taskIds)

    startTransition(async () => {
      try {
        const result = await bulkDeleteTasksAction(taskIds, projectId)
        if (!result.success) {
          setError(result.error)
          useBoardStore.getState().setLists(snapshot)
          return
        }
        onSuccess?.()
      } finally {
        for (const id of taskIds) setTaskPending(id, false)
      }
    })
  }

  /**
   * Bulk edit (move to a column, and/or set priority/assignee) for the
   * currently-selected tasks.
   */
  function bulkUpdateTasks(
    taskIds: string[],
    input: { listId?: string; priority?: Task["priority"]; assigneeId?: string | null },
    onSuccess?: () => void
  ) {
    setError(null)

    const snapshot = useBoardStore.getState().lists
    for (const id of taskIds) setTaskPending(id, true)
    bulkUpdateTasksInStore(taskIds, input)

    startTransition(async () => {
      try {
        const result = await bulkUpdateTasksAction(projectId, { taskIds, ...input })
        if (!result.success) {
          setError(result.error)
          useBoardStore.getState().setLists(snapshot)
          return
        }
        onSuccess?.()
      } finally {
        for (const id of taskIds) setTaskPending(id, false)
      }
    })
  }

  return {
    isPending,
    error,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    bulkDeleteTasks,
    bulkUpdateTasks,
  }
}