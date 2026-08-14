"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { useTasks } from "@/hooks/use-tasks"
import { useBoardStore } from "@/stores/board-store"
import { CreateTaskModal } from "@/components/modals/create-task-modal"

/**
 * Relies on the board store already being hydrated (KanbanBoard does this
 * on mount for the current project), so this button should be rendered
 * on a page where the board is present — e.g. the project detail page.
 */
export function CreateTaskButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false)
  const lists = useBoardStore((s) => s.lists)
  const { createTask, isPending, error } = useTasks(projectId)

  if (lists.length === 0) {
    return null // no columns yet to file a task under
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 shrink-0 rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-foreground dark:text-paper hover:bg-muted transition-colors"
      >
        <Plus className="h-4 w-4" />
        New Task
      </button>

      {open && (
        <CreateTaskModal
          lists={lists}
          isPending={isPending}
          error={error}
          onClose={() => setOpen(false)}
          onSubmit={(values) => {
            if (!values.listId) return
            createTask(
              {
                title: values.title,
                description: values.description,
                listId: values.listId,
                priority: values.priority,
                dueDate: values.dueDate,
              },
              () => setOpen(false)
            )
          }}
        />
      )}
    </>
  )
}