"use client"

import { useCallback, useState, useTransition } from "react"
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
  const {
    lists,
    setLists,
    reorder,
    addList,
    renameList: renameListInStore,
    removeList,
    setListPending,
  } = useBoardStore()

  // every function below is wrapped in usecallback and reads current store
  // state via `useboardstore.getstate()` rather than the subscribed `lists`
  // value, so their identity only changes if `projectid` (or a store
  // action, which zustand keeps stable) changes - not on every board
  // mutation. that stability is what lets boardcolumn/taskcard be wrapped
  // in react.memo and actually skip re-rendering columns that didn't
  // change, instead of getting a "new" callback prop every render.

  const createList = useCallback(
    (name: string, onSuccess?: (list: ListWithTasks) => void) => {
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
    },
    [projectId, addList]
  )

  const updateListLocal = useCallback(
    (listId: string, input: ListUpdateInput) => {
      const previousName = useBoardStore.getState().lists.find((l) => l.id === listId)?.name
      if (input.name) renameListInStore(listId, input.name)

      setError(null)
      setListPending(listId, true)
      startTransition(async () => {
        try {
          const result = await updateListAction(listId, projectId, input)
          if (!result.success) {
            setError(result.error)
            if (previousName) renameListInStore(listId, previousName)
          }
        } finally {
          setListPending(listId, false)
        }
      })
    },
    [projectId, renameListInStore, setListPending]
  )

  const renameList = useCallback(
    (listId: string, name: string) => updateListLocal(listId, { name }),
    [updateListLocal]
  )

  const deleteList = useCallback(
    (listId: string) => {
      const previous = useBoardStore.getState().lists
      setListPending(listId, true)
      removeList(listId)

      setError(null)
      startTransition(async () => {
        try {
          const result = await deleteListAction(listId, projectId)
          if (!result.success) {
            setError(result.error)
            setLists(previous)
          }
        } finally {
          setListPending(listId, false)
        }
      })
    },
    [projectId, removeList, setLists, setListPending]
  )

  const reorderLists = useCallback(
    (orderedListIds: string[]) => {
      const previous = useBoardStore.getState().lists
      reorder(orderedListIds)

      setError(null)
      startTransition(async () => {
        const result = await reorderListsAction({ projectId, orderedListIds })
        if (!result.success) {
          setError(result.error)
          setLists(previous)
        }
      })
    },
    [projectId, reorder, setLists]
  )

  return {
    lists,
    isPending,
    error,
    setLists,
    createList,
    renameList,
    deleteList,
    reorderLists,
  }
}