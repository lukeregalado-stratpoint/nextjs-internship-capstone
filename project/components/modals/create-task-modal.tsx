// TODO: Task 4.4 - Build task creation and editing functionality
// TODO: Task 5.6 - Create task detail modals and editing interfaces

/*
TODO: Implementation Notes for Interns:

Modal for creating and editing tasks.

Features to implement:
- Task title and description
- Priority selection
- Assignee selection
- Due date picker
- Labels/tags
- Attachments
- Comments section (for edit mode)
- Activity history (for edit mode)

Form fields:
- Title (required)
- Description (rich text editor)
- Priority (low/medium/high)
- Assignee (team member selector)
- Due date (date picker)
- Labels (tag input)
- Attachments (file upload)

Integration:
- Use task validation schema
- Call task creation/update API
- Update board state optimistically
- Handle file uploads
- Real-time updates for comments
*/

"use client"

import { useState, type FormEvent } from "react"
import { X } from "lucide-react"
import type { Task } from "@/lib/db/schema"
import type { ListWithTasks } from "@/stores/board-store"

type Priority = "low" | "medium" | "high"

export interface TaskFormSubmitValues {
  title: string
  description?: string
  listId?: string
  priority: Priority
  dueDate: Date | null
}

interface CreateTaskModalProps {
  /** Columns available to file the task under. */
  lists: ListWithTasks[]
  /** Presence of `task` puts the modal in edit mode. */
  task?: Task
  /** Column to preselect in create mode. */
  defaultListId?: string
  onClose: () => void
  onSubmit: (values: TaskFormSubmitValues) => void
  onDelete?: () => void
  isPending?: boolean
  error?: string | null
}

export function CreateTaskModal({
  lists,
  task,
  defaultListId,
  onClose,
  onSubmit,
  onDelete,
  isPending,
  error,
}: CreateTaskModalProps) {
  const isEditing = Boolean(task)

  const [title, setTitle] = useState(task?.title ?? "")
  const [description, setDescription] = useState(task?.description ?? "")
  const [listId, setListId] = useState(task?.listId ?? defaultListId ?? lists[0]?.id ?? "")
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium")
  const [dueDate, setDueDate] = useState(
    task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ""
  )

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    onSubmit({
      title: trimmedTitle,
      description: description.trim() || undefined,
      // In edit mode, only send listId if it actually changed — this is
      // what tells the action to treat it as a move.
      listId: isEditing ? (listId !== task?.listId ? listId : undefined) : listId,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-outer_space-500 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-outer_space-500 dark:text-platinum-500">
            {isEditing ? "Edit Task" : "New Task"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-french_gray-100 dark:hover:bg-paynes_gray-500/20 text-paynes_gray-500 dark:text-french_gray-400"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="task-title" className="block text-sm font-medium text-outer_space-500 dark:text-platinum-500 mb-1">
              Title
            </label>
            <input
              id="task-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
              placeholder="e.g. Design the onboarding flow"
              className="w-full px-3 py-2 border border-french_gray-300 dark:border-paynes_gray-400 rounded-lg bg-white dark:bg-outer_space-500 text-outer_space-500 dark:text-platinum-500 focus:outline-none focus:ring-2 focus:ring-blue_munsell-500"
            />
          </div>

          <div>
            <label htmlFor="task-description" className="block text-sm font-medium text-outer_space-500 dark:text-platinum-500 mb-1">
              Description
            </label>
            <textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
              rows={3}
              placeholder="Add more detail (optional)"
              className="w-full px-3 py-2 border border-french_gray-300 dark:border-paynes_gray-400 rounded-lg bg-white dark:bg-outer_space-500 text-outer_space-500 dark:text-platinum-500 focus:outline-none focus:ring-2 focus:ring-blue_munsell-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-list" className="block text-sm font-medium text-outer_space-500 dark:text-platinum-500 mb-1">
                Column
              </label>
              <select
                id="task-list"
                value={listId}
                onChange={(e) => setListId(e.target.value)}
                className="w-full px-3 py-2 border border-french_gray-300 dark:border-paynes_gray-400 rounded-lg bg-white dark:bg-outer_space-500 text-outer_space-500 dark:text-platinum-500 focus:outline-none focus:ring-2 focus:ring-blue_munsell-500"
              >
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="task-priority" className="block text-sm font-medium text-outer_space-500 dark:text-platinum-500 mb-1">
                Priority
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 border border-french_gray-300 dark:border-paynes_gray-400 rounded-lg bg-white dark:bg-outer_space-500 text-outer_space-500 dark:text-platinum-500 focus:outline-none focus:ring-2 focus:ring-blue_munsell-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="task-due-date" className="block text-sm font-medium text-outer_space-500 dark:text-platinum-500 mb-1">
              Due date
            </label>
            <input
              id="task-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-french_gray-300 dark:border-paynes_gray-400 rounded-lg bg-white dark:bg-outer_space-500 text-outer_space-500 dark:text-platinum-500 focus:outline-none focus:ring-2 focus:ring-blue_munsell-500"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {isEditing && onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                disabled={isPending}
                className="text-sm text-red-500 hover:text-red-600 disabled:opacity-50"
              >
                Delete task
              </button>
            ) : (
              <span />
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg border border-french_gray-300 dark:border-paynes_gray-400 text-outer_space-500 dark:text-platinum-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !title.trim()}
                className="px-4 py-2 text-sm rounded-lg bg-blue_munsell-500 text-white hover:bg-blue_munsell-600 disabled:opacity-50"
              >
                {isPending ? "Saving..." : isEditing ? "Save changes" : "Create task"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
