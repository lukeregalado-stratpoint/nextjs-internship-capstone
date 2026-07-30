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

import { Calendar } from "lucide-react"
import type { Task } from "@/lib/db/schema"

const priorityStyles: Record<Task["priority"], string> = {
  low: "bg-mint-100 text-mint-700 dark:bg-mint-900/30 dark:text-mint-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  high: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
}

export function TaskCard({ task, onClick }: { task: Task; onClick?: () => void }) {
  const isOverdue = task.dueDate ? new Date(task.dueDate) < new Date() : false

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-outer_space-500 rounded-xl border border-lavender-100 dark:border-paynes_gray-400 px-3 py-2.5 hover:border-lavender-300 hover:shadow-sm transition-all space-y-2"
    >
      <p className="text-sm font-medium text-outer_space-500 dark:text-platinum-500 leading-snug">
        {task.title}
      </p>

      {task.description && (
        <p className="text-xs text-paynes_gray-500 dark:text-french_gray-400 line-clamp-2">
          {task.description}
        </p>
      )}

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
    </button>
  )
}