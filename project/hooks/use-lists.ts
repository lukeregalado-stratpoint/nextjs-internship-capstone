"use client"

import { useState, useTransition } from "react"
import {
  createListAction,
  deleteListAction,
  reorderListsAction,
  updateListAction,
} from "@/lib/actions/lists"
import type { ListUpdateInput } from "@/lib/validations"
import { useBoardStore, type ListWithTasks } from "@/stores/board-store"

export function useLists(projectId: string) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const { lists, setLists, reorder, addList, renameList, removeList } = useBoardStore()

  function createList(name: string, onSuccess?: (list: ListWithTasks) => void) {
    setError(null)
    startTransition(async () => {
      const result = await createListAction({ name, projectId })
      if (!result.success) {
        setError(result.error)
        return
      }
      addList(result.data)
      onSuccess?.({ ...result.data, tasks: [] })
    })
  }

  function updateListLocal(listId: string, input: ListUpdateInput) {
    const previousName = lists.find((l) => l.id === listId)?.name
    if (input.name) renameList(listId, input.name)

    setError(null)
    startTransition(async () => {
      const result = await updateListAction(listId, projectId, input)
      if (!result.success) {
        setError(result.error)
        if (previousName) renameList(listId, previousName)
      }
    })
  }

  function deleteList(listId: string) {
    const previous = lists
    removeList(listId)

    setError(null)
    startTransition(async () => {
      const result = await deleteListAction(listId, projectId)
      if (!result.success) {
        setError(result.error)
        setLists(previous)
      }
    })
  }

  function reorderLists(orderedListIds: string[]) {
    const previous = lists
    reorder(orderedListIds)

    setError(null)
    startTransition(async () => {
      const result = await reorderListsAction({ projectId, orderedListIds })
      if (!result.success) {
        setError(result.error)
        setLists(previous)
      }
    })
  }

  return {
    lists,
    isPending,
    error,
    setLists,
    createList,
    renameList: (listId: string, name: string) => updateListLocal(listId, { name }),
    deleteList,
    reorderLists,
  }
}
