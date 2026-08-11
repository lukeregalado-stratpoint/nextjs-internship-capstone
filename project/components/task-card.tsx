// TODO: Task 5.6 - Create task detail modals and editing interfaces

/*
TODO: Implementation Notes for Interns:

This component should display:
- Task title and description
- Priority indicator
- Assignee avatar
- Due date
- Labels/tags
- Comments count
- Drag handle for reordering

Props interface:
interface TaskCardProps {
  task: {
    id: string
    title: string
    description?: string
    priority: 'low' | 'medium' | 'high'
    assignee?: User
    dueDate?: Date
    labels: string[]
    commentsCount: number
  }
  isDragging?: boolean
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

Features to implement:
- Drag and drop support
- Click to open task modal
- Priority color coding
- Overdue indicators
- Responsive design
*/

"use client"

import { Calendar, Check } from "lucide-react"
import type { KeyboardEvent, MouseEvent } from "react"
import type { Task } from "@/lib/db/schema"

const priorityStyles: Record<Task["priority"], string> = {
  low: "bg-mint-100 text-mint-700 dark:bg-mint-900/30 dark:text-mint-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  high: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ""
  return (first + last).toUpperCase()
}

export function TaskCard({
  task,
  assigneeName,
  labels,
  onClick,
  selected = false,
  onToggleSelect,
}: {
  task: Task
  /** Resolved from task.assigneeId by the parent, which has the member list. */
  assigneeName?: string
  /** Resolved from task.taskLabels by the parent, which has the project's label set. */
  labels?: { id: string; name: string; color: string }[]
  onClick?: () => void
  /** Whether this task is part of the board's current multi-select. */
  selected?: boolean
  /**
   * Present -> this card is selectable: shows a checkbox and lets
   * Cmd/Ctrl+click toggle selection instead of opening the task. Omit to
   * render a plain (non-selectable) card, e.g. in the drag overlay.
   */
  onToggleSelect?: () => void
}) {
  const isOverdue = task.dueDate ? new Date(task.dueDate) < new Date() : false

  function handleClick(e: MouseEvent) {
    if (onToggleSelect && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      onToggleSelect()
      return
    }
    onClick?.()
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onClick?.()
    }
  }

  function handleCheckboxPointerDown(e: MouseEvent) {
    // Cards inside SortableTaskCard have dnd-kit's drag listeners on an
    // ancestor element (bound to pointerdown) — stop it here too, not just
    // on click, or tapping the checkbox can be swallowed as a drag start.
    e.stopPropagation()
  }

  return (
    // A plain <button> can't contain the nested checkbox <button> below
    // (invalid HTML), so this is a div acting as a button: same click/
    // keyboard/focus behavior via role, tabIndex, and onKeyDown.
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`group relative w-full text-left bg-white dark:bg-outer_space-500 rounded-xl border px-3 py-2.5 transition-all space-y-2 cursor-pointer ${
        selected
          ? "border-lavender-400 ring-2 ring-lavender-400/60"
          : "border-lavender-100 dark:border-paynes_gray-400 hover:border-lavender-300 hover:shadow-sm"
      }`}
    >
      {onToggleSelect && (
        <button
          type="button"
          onPointerDown={handleCheckboxPointerDown}
          onClick={(e) => {
            e.stopPropagation()
            onToggleSelect()
          }}
          aria-label={selected ? "Deselect task" : "Select task"}
          aria-pressed={selected}
          className={`absolute top-2 right-2 h-4.5 w-4.5 flex items-center justify-center rounded-md border transition-colors ${
            selected
              ? "bg-lavender-500 border-lavender-500 text-white opacity-100"
              : "border-lavender-200 dark:border-paynes_gray-400 bg-white dark:bg-outer_space-500 opacity-0 group-hover:opacity-100 focus:opacity-100"
          }`}
        >
          {selected && <Check size={11} strokeWidth={3} />}
        </button>
      )}

      <p className="text-sm font-medium text-outer_space-500 dark:text-platinum-500 leading-snug pr-6">
        {task.title}
      </p>

      {task.description && (
        <p className="text-xs text-paynes_gray-500 dark:text-french_gray-400 line-clamp-2">
          {task.description}
        </p>
      )}

      {labels && labels.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {labels.map((label) => (
            <span
              key={label.id}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${priorityStyles[task.priority]}`}
          >
            {task.priority}
          </span>

          {task.dueDate && (
            <span
              className={`inline-flex items-center gap-1 text-[11px] ${
                isOverdue ? "text-rose-500" : "text-paynes_gray-500 dark:text-french_gray-400"
              }`}
            >
              <Calendar size={11} />
              {new Date(task.dueDate).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </div>

        {assigneeName && (
          <span
            title={assigneeName}
            className="shrink-0 inline-flex items-center justify-center h-5 w-5 rounded-full
             bg-lavender-200 dark:bg-lavender-700/50 text-[10px] font-semibold
              text-lavender-700 dark:text-lavender-200"
          >
            {initials(assigneeName)}
          </span>
        )}
      </div>
    </div>
  )
}