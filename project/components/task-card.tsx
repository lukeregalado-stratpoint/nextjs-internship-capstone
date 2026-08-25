// todo: task 5.6, task detail modal / editing interface (see modals/create-task-modal.tsx)

/*
old planning notes, keeping around for reference until the modal work above
is actually done:
- title, description, priority, assignee avatar, due date, labels, comment
  count, drag handle
- click opens the task modal, priority gets color coded, overdue shows a
  flag, needs to hold up on small screens
*/

"use client"

import { memo } from "react"
import { Calendar, Check, Loader2 } from "lucide-react"
import type { KeyboardEvent, MouseEvent } from "react"
import type { Task } from "@/lib/db/schema"

const priorityStyles: Record<Task["priority"], string> = {
  low: "bg-done-wash text-done-text dark:bg-done-wash-dark dark:text-done-text-dark",
  medium: "bg-review-wash text-review-text dark:bg-review-wash-dark dark:text-review-text-dark",
  high: "bg-blocked-wash text-blocked-text dark:bg-blocked-wash-dark dark:text-blocked-text-dark",
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ""
  return (first + last).toUpperCase()
}

export const TaskCard = memo(function TaskCard({
  task,
  assigneeName,
  labels,
  onClick,
  selected = false,
  onToggleSelect,
  pending = false,
}: {
  task: Task
  /** resolved from task.assigneeid by the parent, which has the member list */
  assigneeName?: string
  /** resolved from task.tasklabels by the parent, which has the project's label set */
  labels?: { id: string; name: string; color: string }[]
  onClick?: () => void
  /** whether this task is part of the board's current multi-select */
  selected?: boolean
  /**
   * present -> this card is selectable: shows a checkbox and lets
   * cmd/ctrl+click toggle selection instead of opening the task. omit to
   * render a plain (non-selectable) card, e.g. in the drag overlay.
   */
  onToggleSelect?: () => void
  /**
   * true while this task has an unconfirmed optimistic mutation in flight
   * (drag move, bulk edit, etc). purely visual, the card stays fully
   * interactive so a fast second edit isn't blocked by a slow first one.
   */
  pending?: boolean
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
    // cards inside sortabletaskcard have dnd-kit's drag listeners on an
    // ancestor element bound to pointerdown, so stop it here too, not just
    // on click, or tapping the checkbox can get swallowed as a drag start.
    e.stopPropagation()
  }

  return (
    // a plain <button> can't contain the nested checkbox <button> below
    // (invalid html), so this is a div acting as a button: same click,
    // keyboard, and focus behavior via role, tabindex, and onkeydown.
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`group relative w-full text-left bg-surface dark:bg-surface-dark rounded-md border px-3 py-2.5 transition-colors space-y-2 cursor-pointer ${
        selected
          ? "border-primary ring-1 ring-primary/30"
          : "border-line dark:border-line-dark hover:border-primary"
      } ${pending ? "opacity-70" : ""}`}
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
              ? "bg-primary border-primary text-primary-foreground opacity-100"
              : "border-line dark:border-line-dark bg-surface dark:bg-surface-dark opacity-0 group-hover:opacity-100 focus:opacity-100"
          }`}
        >
          {selected && <Check size={11} strokeWidth={3} />}
        </button>
      )}

      <p className="text-sm font-medium text-ink dark:text-paper leading-snug pr-6">
        {task.title}
      </p>

      {task.description && (
        <p className="text-xs text-slate dark:text-slate-dark line-clamp-2">
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

          {pending && (
            <span
              className="inline-flex items-center text-primary"
              aria-label="Saving"
              title="Saving…"
            >
              <Loader2 size={11} className="animate-spin" />
            </span>
          )}

          {task.dueDate && (
            <span
              className={`inline-flex items-center gap-1 text-[11px] ${
                isOverdue ? "text-blocked" : "text-slate dark:text-slate-dark"
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
            className="shrink-0 inline-flex items-center justify-center h-5 w-5 rounded-sm
             bg-signal-wash dark:bg-signal-wash-dark text-[10px] font-semibold
              text-signal-text dark:text-signal-text-dark"
          >
            {initials(assigneeName)}
          </span>
        )}
      </div>
    </div>
  )
})