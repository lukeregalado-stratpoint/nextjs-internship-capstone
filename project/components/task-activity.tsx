"use client"

import {
  ArrowRightLeft,
  Calendar,
  Flag,
  MessageSquare,
  Pencil,
  Plus,
  Tag,
  Trash2,
  UserRound,
} from "lucide-react"
import type { Activity } from "@/lib/db/schema"

export type ActivityWithUser = Activity & { userName: string }

const iconByType: Record<Activity["type"], typeof Plus> = {
  task_created: Plus,
  title_changed: Pencil,
  description_changed: Pencil,
  status_changed: ArrowRightLeft,
  priority_changed: Flag,
  assignee_changed: UserRound,
  due_date_changed: Calendar,
  label_added: Tag,
  label_removed: Tag,
  comment_added: MessageSquare,
  comment_deleted: Trash2,
}

function formatTimestamp(date: Date | string) {
  const d = new Date(date)
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

/** turns an activity row + its metadata into a human-readable sentence. */
function describeActivity(activity: ActivityWithUser): string {
  const meta = (activity.metadata ?? {}) as Record<string, unknown>

  switch (activity.type) {
    case "task_created":
      return "created this task"
    case "title_changed":
      return "renamed this task"
    case "description_changed":
      return "updated the description"
    case "status_changed":
      return `moved this task${meta.fromName ? ` from ${meta.fromName}` : ""} to ${meta.toName ?? "a different column"}`
    case "priority_changed":
      return `changed priority from ${meta.from ?? "?"} to ${meta.to ?? "?"}`
    case "assignee_changed":
      return meta.toId
        ? `reassigned this task`
        : `unassigned ${meta.fromName ? `${meta.fromName} from ` : ""}this task`
    case "due_date_changed":
      return meta.to
        ? `set the due date to ${new Date(meta.to as string).toLocaleDateString()}`
        : "cleared the due date"
    case "label_added":
      return "added a label"
    case "label_removed":
      return "removed a label"
    case "comment_added":
      return "commented"
    case "comment_deleted":
      return "deleted a comment"
    default:
      return "updated this task"
  }
}

export function TaskActivity({ activities }: { activities: ActivityWithUser[] }) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground dark:text-paper/60">
        No activity yet.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {activities.map((activity) => {
        const Icon = iconByType[activity.type] ?? Pencil
        return (
          <li key={activity.id} className="flex items-start gap-2.5">
            <span className="shrink-0 mt-0.5 inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary dark:bg-muted text-primary">
              <Icon size={12} />
            </span>
            <p className="text-sm text-foreground dark:text-paper">
              <span className="font-medium">{activity.userName}</span>{" "}
              <span className="text-muted-foreground">
                {describeActivity(activity)}
              </span>{" "}
              <span className="text-[11px] text-muted-foreground dark:text-paper/60">
                {formatTimestamp(activity.createdAt)}
              </span>
            </p>
          </li>
        )
      })}
    </ul>
  )
}