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
import { Check, Plus, X } from "lucide-react"
import type { Task } from "@/lib/db/schema"
import type { ListWithTasks } from "@/stores/board-store"
import { TaskComments, type CommentWithAuthor } from "@/components/task-comments"
import { TaskActivity, type ActivityWithUser } from "@/components/task-activity"

type Priority = "low" | "medium" | "high"

export interface TaskFormSubmitValues {
  title: string
  description?: string
  listId?: string
  priority: Priority
  dueDate: Date | null
  assigneeId: string | null
  labelIds: string[]
}

interface ProjectLabel {
  id: string
  name: string
  color: string
}

interface CreateTaskModalProps {
  /** Columns available to file the task under. */
  lists: ListWithTasks[]
  /** Project owner + members, for the assignee picker. */
  members?: { id: string; name: string }[]
  /** The project's available labels, for the label picker. */
  labels?: ProjectLabel[]
  /** Resolved from task.taskLabels by the parent (Task itself has no labels field). */
  taskLabelIds?: string[]
  /** Only project owners can create new labels inline from this modal. */
  isOwner?: boolean
  /** Creates a new project label; the parent is expected to add it to `labels` on success. */
  onCreateLabel?: (values: { name: string; color: string }) => void
  /** Presence of `task` puts the modal in edit mode. */
  task?: Task
  /** Column to preselect in create mode. */
  defaultListId?: string
  onClose: () => void
  onSubmit: (values: TaskFormSubmitValues) => void
  onDelete?: () => void
  isPending?: boolean
  error?: string | null
  /**
   * Lifted to the parent (rather than local state) so the checkbox keeps
   * its value across the "create another" remount — a fresh modal instance
   * still reflects whatever the user last chose.
   */
  createAnother: boolean
  onCreateAnotherChange: (value: boolean) => void

  /**
   * Comments + activity are only shown in edit mode, and only when the
   * parent passes them (a create-mode task has no id to attach them to
   * yet). Omitting these props entirely just hides the Comments/Activity
   * tabs rather than rendering an empty state.
   */
  comments?: CommentWithAuthor[]
  activities?: ActivityWithUser[]
  currentUserId?: string
  onAddComment?: (content: string) => void
  onEditComment?: (commentId: string, content: string) => void
  onDeleteComment?: (commentId: string) => void
  commentPending?: boolean
  commentError?: string | null
}

export function CreateTaskModal({
  lists,
  members = [],
  labels = [],
  taskLabelIds = [],
  isOwner = false,
  onCreateLabel,
  task,
  defaultListId,
  onClose,
  onSubmit,
  onDelete,
  isPending,
  error,
  createAnother,
  onCreateAnotherChange,
  comments,
  activities,
  currentUserId,
  onAddComment,
  onEditComment,
  onDeleteComment,
  commentPending,
  commentError,
}: CreateTaskModalProps) {
  const isEditing = Boolean(task)
  const showCommentsTab = isEditing && comments !== undefined && currentUserId !== undefined
  const showActivityTab = isEditing && activities !== undefined
  const [activeTab, setActiveTab] = useState<"details" | "comments" | "activity">("details")

  const [title, setTitle] = useState(task?.title ?? "")
  const [description, setDescription] = useState(task?.description ?? "")
  const [listId, setListId] = useState(task?.listId ?? defaultListId ?? lists[0]?.id ?? "")
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium")
  const [dueDate, setDueDate] = useState(
    task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ""
  )
  const [assigneeId, setAssigneeId] = useState<string>(task?.assigneeId ?? "")
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>(taskLabelIds)
  const [showNewLabelForm, setShowNewLabelForm] = useState(false)
  const [newLabelName, setNewLabelName] = useState("")
  const [newLabelColor, setNewLabelColor] = useState("#8B5CF6")

  function toggleLabel(labelId: string) {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId]
    )
  }

  function handleCreateLabel() {
    const name = newLabelName.trim()
    if (!name || !onCreateLabel) return
    onCreateLabel({ name, color: newLabelColor })
    setNewLabelName("")
    setNewLabelColor("#8B5CF6")
    setShowNewLabelForm(false)
  }

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
      assigneeId: assigneeId || null,
      labelIds: selectedLabelIds,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-white/20 dark:bg-black/20 px-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            {isEditing ? "Edit Task" : "New Task"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-muted text-muted-foreground"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <p className="mb-4 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-xl">
            {error}
          </p>
        )}

        {(showCommentsTab || showActivityTab) && (
          <div className="flex items-center gap-1 mb-4 border-b border-border">
            {(
              [
                ["details", "Details"],
                ...(showCommentsTab ? [["comments", `Comments${comments && comments.length > 0 ? ` (${comments.length})` : ""}`]] : []),
                ...(showActivityTab ? [["activity", "Activity"]] : []),
              ] as [typeof activeTab, string][]
            ).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {activeTab === "comments" && showCommentsTab && (
          <TaskComments
            comments={comments ?? []}
            currentUserId={currentUserId as string}
            canModerate={Boolean(task && onDeleteComment)}
            onAddComment={(content) => onAddComment?.(content)}
            onEditComment={(id, content) => onEditComment?.(id, content)}
            onDeleteComment={(id) => onDeleteComment?.(id)}
            isPending={commentPending}
            error={commentError}
          />
        )}

        {activeTab === "activity" && showActivityTab && (
          <TaskActivity activities={activities ?? []} />
        )}

        {activeTab === "details" && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="task-title" className="block text-sm font-medium text-foreground mb-1">
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
              className="w-full px-3 py-2 border border-input rounded-xl bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label htmlFor="task-description" className="block text-sm font-medium text-foreground mb-1">
              Description
            </label>
            <textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
              rows={3}
              placeholder="Add more detail (optional)"
              className="w-full px-3 py-2 border border-input rounded-xl bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-list" className="block text-sm font-medium text-foreground mb-1">
                Column
              </label>
              <select
                id="task-list"
                value={listId}
                onChange={(e) => setListId(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-xl bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-sans"
              >
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="task-priority" className="block text-sm font-medium text-foreground mb-1">
                Priority
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 border border-input rounded-xl bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-sans"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-due-date" className="block text-sm font-medium text-foreground mb-1">
                Due date
              </label>
              <input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-xl bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label htmlFor="task-assignee" className="block text-sm font-medium text-foreground mb-1">
                Assignee
              </label>
              <select
                id="task-assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-xl bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-sans"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Labels
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {labels.map((label) => {
                const isSelected = selectedLabelIds.includes(label.id)
                return (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => toggleLabel(label.id)}
                    style={
                      isSelected
                        ? { backgroundColor: label.color }
                        : { borderColor: label.color, color: label.color }
                    }
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-full transition-all ${
                      isSelected ? "text-white" : "border bg-transparent"
                    }`}
                  >
                    {label.name}
                  </button>
                )
              })}

              {isOwner && onCreateLabel && !showNewLabelForm && (
                <button
                  type="button"
                  onClick={() => setShowNewLabelForm(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border border-dashed border-input text-muted-foreground"
                >
                  <Plus size={11} />
                  New label
                </button>
              )}
            </div>

            {isOwner && showNewLabelForm && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="color"
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  className="h-8 w-8 rounded-lg border border-input bg-transparent p-0.5"
                  aria-label="Label color"
                />
                <input
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  maxLength={40}
                  placeholder="Label name"
                  className="flex-1 px-3 py-1.5 text-sm border border-input rounded-xl bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={handleCreateLabel}
                  disabled={!newLabelName.trim()}
                  className="px-3 py-1.5 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewLabelForm(false)}
                  className="p-1.5 rounded-full hover:bg-muted text-muted-foreground"
                  aria-label="Cancel new label"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {!isEditing && (
            <label className="flex items-center gap-2.5 text-sm text-foreground select-none cursor-pointer w-fit">
              <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
                <input
                  type="checkbox"
                  checked={createAnother}
                  onChange={(e) => onCreateAnotherChange(e.target.checked)}
                  className="peer sr-only"
                />
                <span
                  className="h-5 w-5 rounded-full border-2 border-border
                   bg-muted transition-colors duration-150
                    peer-checked:bg-primary peer-checked:border-primary
                     peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-1"
                />
                <Check
                  size={12}
                  strokeWidth={3}
                  className="absolute text-primary-foreground opacity-0 scale-50 peer-checked:opacity-100 peer-checked:scale-100
                   transition-all duration-150 pointer-events-none"
                />
              </span>
              Create another task after this one
            </label>
          )}

          <div className="flex items-center justify-between pt-2">
            {isEditing && onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                disabled={isPending}
                className="text-sm text-destructive hover:text-destructive/80 disabled:opacity-50"
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
                className="px-4 py-2 text-sm rounded-xl border border-input text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !title.trim()}
                className="px-4 py-2 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending
                  ? "Saving..."
                  : isEditing
                    ? "Save changes"
                    : createAnother
                      ? "Create & add another"
                      : "Create task"}
              </button>
            </div>
          </div>
        </form>
        )}
      </div>
    </div>
  )
}