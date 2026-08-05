"use client"

import { useState, useTransition } from "react"
import { useBoardStore, type ListWithTasks, type TaskWithLabels } from "@/stores/board-store"
import { createTaskAction, deleteTaskAction, moveTaskAction, updateTaskAction } from "@/lib/actions/tasks"
import type { TaskInput, TaskUpdateInput } from "@/lib/validations"

export function useTasks(projectId: string) {
  const addTaskInStore = useBoardStore((s) => s.addTask)
  const updateTaskInStore = useBoardStore((s) => s.updateTask)
  const removeTaskInStore = useBoardStore((s) => s.removeTask)
  const moveTaskInStore = useBoardStore((s) => s.moveTask)

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

    startTransition(async () => {
      const result = await updateTaskAction(taskId, projectId, input)
      if (!result.success) {
        setError(result.error)
        useBoardStore.getState().setLists(snapshot)
        return
      }
      updateTaskInStore(taskId, result.data)
      onSuccess?.(result.data)
    })
  }

  function deleteTask(taskId: string, onSuccess?: () => void) {
    setError(null)

    const snapshot = useBoardStore.getState().lists
    removeTaskInStore(taskId)

    startTransition(async () => {
      const result = await deleteTaskAction(taskId, projectId)
      if (!result.success) {
        setError(result.error)
        useBoardStore.getState().setLists(snapshot)
        return
      }
      onSuccess?.()
    })
  }

  /**
   * retains drag + drop result
   */
  function moveTask(
    taskId: string,
    destListId: string,
    orderedTaskIds: string[],
    rollbackTo: ListWithTasks[]
  ) {
    setError(null)
    startTransition(async () => {
      const result = await moveTaskAction(projectId, { taskId, destListId, orderedTaskIds })
      if (!result.success) {
        setError(result.error)
        useBoardStore.getState().setLists(rollbackTo)
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
  }
}