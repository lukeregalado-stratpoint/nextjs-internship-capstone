"use client"

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react"
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Loader2, MoreVertical, Pencil, Plus, Trash2, X } from "lucide-react"
import { useLists } from "@/hooks/use-lists"
import { useTasks } from "@/hooks/use-tasks"
import { CreateTaskModal, type TaskFormSubmitValues } from "@/components/modals/create-task-modal"
import { TaskCard } from "@/components/task-card"
import { TaskSearchBar } from "@/components/task-search-bar"
import { useBoardStore, type ListWithTasks, type TaskWithLabels } from "@/stores/board-store"
import { filterTasks } from "@/lib/task-search"
import { createLabelAction } from "@/lib/actions/labels"
import {
  createCommentAction,
  deleteCommentAction,
  getTaskThreadAction,
  updateCommentAction,
  type ActivityWithUser,
  type CommentWithAuthor,
} from "@/lib/actions/comments"
import type { Label, Task } from "@/lib/db/schema"

export function KanbanBoard({
  projectId,
  currentUserId,
  initialLists,
  members = [],
  initialLabels = [],
  isOwner = false,
}: {
  projectId: string
  /** Needed for the Comments tab — whose comments can be edited/deleted inline, and who a new comment is posted as. */
  currentUserId: string
  initialLists: ListWithTasks[]
  members?: { id: string; name: string }[]
  initialLabels?: Label[]
  isOwner?: boolean
}) {
  const { lists, setLists, createList, renameList, deleteList, reorderLists, isPending, error } =
    useLists(projectId)
  const {
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    bulkDeleteTasks,
    bulkUpdateTasks,
    isPending: taskPending,
    error: taskError,
  } = useTasks(projectId)
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState("")
  const [labels, setLabels] = useState<Label[]>(initialLabels)
  // `task` present = editing that task; absent = creating a new one in `listId`.
  const [taskModal, setTaskModal] = useState<{ listId: string; task?: TaskWithLabels } | null>(
    null
  )
  // Bumped every time we (re)open a fresh create modal so React remounts
  // CreateTaskModal instead of reusing one with stale field values —
  // needed for the "create another" flow below.
  const [taskModalKey, setTaskModalKey] = useState(0)
  // Lives here (not inside CreateTaskModal) so the checkbox's value
  // survives that remount instead of resetting to false each time.
  const [createAnother, setCreateAnother] = useState(false)
  const [activeTask, setActiveTask] = useState<TaskWithLabels | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Multi-select for bulk operations (task 5). Selection lives in the
  // board store (not local state) so it's addressable from the store's own
  // optimistic bulk mutations without threading callbacks everywhere.
  const selectedTaskIds = useBoardStore((s) => s.selectedTaskIds)
  const toggleTaskSelection = useBoardStore((s) => s.toggleTaskSelection)
  const selectTasks = useBoardStore((s) => s.selectTasks)
  const clearSelection = useBoardStore((s) => s.clearSelection)
  const selectedCount = selectedTaskIds.size

  // Comments + activity for whichever task is currently open in edit mode.
  // Fetched on open rather than kept on every task in `lists` — the board
  // already carries enough per-task data as it is, and most opens never
  // touch these tabs.
  const [taskThread, setTaskThread] = useState<{
    comments: CommentWithAuthor[]
    activities: ActivityWithUser[]
  } | null>(null)
  const [threadError, setThreadError] = useState<string | null>(null)
  const [commentPending, startCommentTransition] = useTransition()

  const isSearching = searchQuery.trim().length > 0
  const memberNameById = useMemo(() => new Map(members.map((m) => [m.id, m.name])), [members])
  const memberNames = useMemo(() => members.map((m) => m.name), [members])

  const displayLists = useMemo(() => {
    if (!isSearching) return lists
    return lists.map((list) => ({
      ...list,
      tasks: filterTasks(list.tasks, searchQuery, memberNameById),
    }))
  }, [lists, isSearching, searchQuery, memberNameById])

  const totalTaskCount = useMemo(() => lists.reduce((sum, l) => sum + l.tasks.length, 0), [lists])
  const matchedTaskCount = useMemo(
    () => displayLists.reduce((sum, l) => sum + l.tasks.length, 0),
    [displayLists]
  )

  const dragSnapshotRef = useRef<ListWithTasks[] | null>(null)

  // hydrate — useLayoutEffect (not useEffect) so this flushes before the
  // browser paints. The store's initial `lists` is always `[]`, so on a
  // fresh mount there'd otherwise be one visible frame of an empty board
  // before this fills it in.
  useLayoutEffect(() => {
    setLists(initialLists)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const editingTaskId = taskModal?.task?.id

  useEffect(() => {
    if (!editingTaskId) {
      setTaskThread(null)
      setThreadError(null)
      return
    }
    let cancelled = false
    setThreadError(null)
    setTaskThread({ comments: [], activities: [] })
    getTaskThreadAction(editingTaskId).then((result) => {
      if (cancelled) return
      if (result.success) {
        setTaskThread(result.data)
      } else {
        setThreadError(result.error)
      }
    })
    return () => {
      cancelled = true
    }
  }, [editingTaskId])

  // Keyboard shortcuts: Cmd/Ctrl+A selects every currently-visible task,
  // Escape clears the selection, Delete/Backspace bulk-deletes it. Ignored
  // while the task modal is open or while focus is in a text field, so
  // these never hijack normal typing (including inside the search bar).
  useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false
      const tag = target.tagName
      return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (taskModal) return
      if (isTypingTarget(e.target)) return

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        if (totalTaskCount === 0) return
        e.preventDefault()
        const visibleIds = displayLists.flatMap((l) => l.tasks.map((t) => t.id))
        selectTasks(visibleIds)
        return
      }

      if (e.key === "Escape" && selectedTaskIds.size > 0) {
        clearSelection()
        return
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selectedTaskIds.size > 0) {
        e.preventDefault()
        const ids = Array.from(selectedTaskIds)
        const message =
          ids.length === 1
            ? "Delete this task? This can't be undone."
            : `Delete ${ids.length} tasks? This can't be undone.`
        if (confirm(message)) {
          bulkDeleteTasks(ids, () => clearSelection())
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    taskModal,
    selectedTaskIds,
    displayLists,
    totalTaskCount,
    selectTasks,
    clearSelection,
    bulkDeleteTasks,
  ])

  // On touch devices, require a slightly longer press-hold before a drag
  // starts so a normal horizontal swipe/scroll isn't hijacked as a drag.
  const sensors = useSensors(
  useSensor(MouseSensor, {
    activationConstraint: { distance: 6 },
  }),
  useSensor(TouchSensor, {
    activationConstraint: { delay: 150, tolerance: 8 },
  })
)

  // Stable across renders (deps are just setState functions, which React
  // guarantees are stable) so they can be passed straight into memoized
  // BoardColumn instances without invalidating them every render.
  const handleAddTask = useCallback((listId: string) => {
    setTaskModalKey((k) => k + 1)
    setTaskModal({ listId })
  }, [])

  const handleTaskClick = useCallback((listId: string, task: TaskWithLabels) => {
    setTaskModal({ listId, task })
  }, [])

  function findListIdForTask(taskId: string) {
    return lists.find((l) => l.tasks.some((t) => t.id === taskId))?.id
  }

  // `over.id` can be a task id, a column's own sortable id, or the
  // dropzone id nested inside a column (used for dropping tasks into a
  // short/empty column). This unwraps it back to a real list id.
  function resolveOverListId(over: { id: string | number; data: { current?: Record<string, unknown> } }) {
    if (over.data.current?.type === "column-dropzone") {
      return over.data.current.listId as string
    }
    return String(over.id)
  }

  function handleDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type !== "task") return
    dragSnapshotRef.current = lists.map((l) => ({ ...l, tasks: [...l.tasks] }))
    const task = lists.flatMap((l) => l.tasks).find((t) => t.id === event.active.id)
    setActiveTask(task ?? null)
  }

  // move task into column cursor is hovering
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over || active.data.current?.type !== "task") return

    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId) return

    const activeListId = findListIdForTask(activeId)
    const overListId = findListIdForTask(overId) ?? resolveOverListId(over)
    if (!activeListId || activeListId === overListId) return

    const overList = lists.find((l) => l.id === overListId)
    if (!overList) return

    const overIndex = overList.tasks.findIndex((t) => t.id === overId)
    useBoardStore
      .getState()
      .moveTask(activeId, overListId, overIndex === -1 ? undefined : overIndex)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (active.data.current?.type === "task") {
      const snapshot = dragSnapshotRef.current
      dragSnapshotRef.current = null
      setActiveTask(null)
      if (!over) return

      const activeId = String(active.id)
      const overId = String(over.id)
      const destListId = findListIdForTask(overId) ?? resolveOverListId(over)
      const destList = useBoardStore.getState().lists.find((l) => l.id === destListId)
      if (!destList) return

      let orderedTaskIds = destList.tasks.map((t) => t.id)
      const activeIndex = orderedTaskIds.indexOf(activeId)
      const overIndex = orderedTaskIds.indexOf(overId)
      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        orderedTaskIds = arrayMove(orderedTaskIds, activeIndex, overIndex)
        useBoardStore.getState().reorderTasksInList(destListId, orderedTaskIds)
      }

      moveTask(activeId, destListId, orderedTaskIds, snapshot ?? lists)
      return
    }

    if (!over) return
    const overListId = resolveOverListId(over)
    if (active.id === overListId) return
    const oldIndex = lists.findIndex((l) => l.id === active.id)
    const newIndex = lists.findIndex((l) => l.id === overListId)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(lists, oldIndex, newIndex)
    reorderLists(reordered.map((l) => l.id))
  }

  function handleAddColumn(e: FormEvent) {
    e.preventDefault()
    if (!newColumnName.trim()) return
    createList(newColumnName.trim(), () => {
      setNewColumnName("")
      setAddingColumn(false)
    })
  }

  function handleTaskSubmit(values: TaskFormSubmitValues) {
    if (taskModal?.task) {
      updateTask(
        taskModal.task.id,
        {
          title: values.title,
          description: values.description,
          listId: values.listId,
          priority: values.priority,
          dueDate: values.dueDate,
          assigneeId: values.assigneeId,
          labelIds: values.labelIds,
        },
        () => setTaskModal(null)
      )
    } else if (taskModal) {
      const listId = taskModal.listId
      createTask(
        {
          title: values.title,
          description: values.description,
          listId: values.listId ?? listId,
          priority: values.priority,
          dueDate: values.dueDate,
          assigneeId: values.assigneeId,
          labelIds: values.labelIds,
        },
        () => {
          if (createAnother) {
            // Reopen a blank create modal for the same column. The key
            // bump forces a remount so title/description/etc. reset.
            setTaskModalKey((k) => k + 1)
            setTaskModal({ listId })
          } else {
            setTaskModal(null)
          }
        }
      )
    }
  }

  function handleTaskDelete() {
    if (!taskModal?.task) return
    if (confirm(`Delete "${taskModal.task.title}"? This can't be undone.`)) {
      deleteTask(taskModal.task.id, () => setTaskModal(null))
    }
  }

  async function handleCreateLabel(values: { name: string; color: string }) {
    const result = await createLabelAction(projectId, values)
    if (result.success) {
      setLabels((prev) => [...prev, result.data])
    }
  }

  function handleAddComment(content: string) {
    if (!taskModal?.task) return
    const taskId = taskModal.task.id
    setThreadError(null)
    startCommentTransition(async () => {
      const result = await createCommentAction(taskId, projectId, { content })
      if (!result.success) {
        setThreadError(result.error)
        return
      }
      setTaskThread((prev) =>
        prev ? { ...prev, comments: [...prev.comments, result.data] } : prev
      )
      // A comment_added activity was logged server-side; refetch just the
      // activity feed so the two tabs stay in sync without a full reload.
      const refreshed = await getTaskThreadAction(taskId)
      if (refreshed.success) setTaskThread(refreshed.data)
    })
  }

  function handleEditComment(commentId: string, content: string) {
    if (!taskModal?.task) return
    const taskId = taskModal.task.id
    setThreadError(null)
    startCommentTransition(async () => {
      const result = await updateCommentAction(commentId, taskId, projectId, { content })
      if (!result.success) {
        setThreadError(result.error)
        return
      }
      setTaskThread((prev) =>
        prev
          ? {
              ...prev,
              comments: prev.comments.map((c) =>
                c.id === commentId ? { ...c, ...result.data } : c
              ),
            }
          : prev
      )
    })
  }

  function handleDeleteComment(commentId: string) {
    if (!taskModal?.task) return
    const taskId = taskModal.task.id
    setThreadError(null)
    startCommentTransition(async () => {
      const result = await deleteCommentAction(commentId, taskId, projectId)
      if (!result.success) {
        setThreadError(result.error)
        return
      }
      const refreshed = await getTaskThreadAction(taskId)
      if (refreshed.success) {
        setTaskThread(refreshed.data)
      } else {
        setTaskThread((prev) =>
          prev ? { ...prev, comments: prev.comments.filter((c) => c.id !== commentId) } : prev
        )
      }
    })
  }

  function handleBulkDelete() {
    const ids = Array.from(selectedTaskIds)
    if (ids.length === 0) return
    const message =
      ids.length === 1
        ? "Delete this task? This can't be undone."
        : `Delete ${ids.length} tasks? This can't be undone.`
    if (confirm(message)) {
      bulkDeleteTasks(ids, () => clearSelection())
    }
  }

  function handleBulkMove(destListId: string) {
    const ids = Array.from(selectedTaskIds)
    if (ids.length === 0 || !destListId) return
    bulkUpdateTasks(ids, { listId: destListId })
  }

  function handleBulkPriority(priority: Task["priority"]) {
    const ids = Array.from(selectedTaskIds)
    if (ids.length === 0) return
    bulkUpdateTasks(ids, { priority })
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-500 px-3 sm:px-0">{error}</p>}
      {taskError && <p className="text-sm text-red-500 px-3 sm:px-0">{taskError}</p>}

      <div className="px-3 sm:px-0">
        <TaskSearchBar
          query={searchQuery}
          onQueryChange={setSearchQuery}
          memberNames={memberNames}
          matchCount={matchedTaskCount}
          totalCount={totalTaskCount}
        />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={lists.map((l) => l.id)} strategy={horizontalListSortingStrategy}>
          <div
            className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto pb-4
            snap-x snap-mandatory scroll-px-3 px-3 -mx-3 sm:mx-0 sm:px-0 sm:snap-none"
          >
            {displayLists.map((list) => (
              <BoardColumn
                key={list.id}
                list={list}
                isSearching={isSearching}
                memberNameById={memberNameById}
                selectedTaskIds={selectedTaskIds}
                onToggleTaskSelection={toggleTaskSelection}
                onRename={renameList}
                onDelete={deleteList}
                onAddTask={handleAddTask}
                onTaskClick={handleTaskClick}
              />
            ))}

            <div className="w-[85vw] max-w-[288px] sm:w-72 shrink-0 snap-start">
              {addingColumn ? (
                <form
                  onSubmit={handleAddColumn}
                  className="bg-muted rounded-2xl p-3 space-y-2"
                >
                  <input
                    autoFocus
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    placeholder="Column name"
                    maxLength={60}
                    className="w-full px-3 py-2 border border-border
                     rounded-xl bg-card text-foreground dark:text-paper
                      focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isPending || !newColumnName.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90
                       disabled:opacity-50"
                    >
                      {isPending && <Loader2 size={14} className="animate-spin" />}
                      Add column
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddingColumn(false)
                        setNewColumnName("")
                      }}
                      className="px-3 py-1.5 text-sm rounded-xl border border-border
                       text-foreground dark:text-paper"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setAddingColumn(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-primary
                   dark:border-border rounded-2xl text-muted-foreground dark:text-paper/60
                    hover:border-primary hover:text-primary hover:bg-primary transition-colors"
                >
                  <Plus size={16} /> Add column
                </button>
              )}
            </div>
          </div>
        </SortableContext>

        <DragOverlay>
          {activeTask ? (
            <TaskCard
              task={activeTask}
              assigneeName={activeTask.assigneeId ? memberNameById.get(activeTask.assigneeId) : undefined}
              labels={activeTask.labels}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {selectedCount > 0 && (
        <div
          className="sticky bottom-3 z-20 mx-3 sm:mx-0 flex flex-wrap items-center gap-2 rounded-2xl
           border border-border bg-card
            px-4 py-2.5 shadow-lg"
        >
          <span className="text-sm font-medium text-foreground dark:text-paper shrink-0">
            {selectedCount} selected
          </span>

          <select
            defaultValue=""
            onChange={(e) => {
              handleBulkMove(e.target.value)
              e.target.value = ""
            }}
            disabled={taskPending}
            className="text-sm px-2 py-1.5 rounded-lg border border-border
             bg-card text-foreground dark:text-paper disabled:opacity-50"
          >
            <option value="" disabled>
              Move to…
            </option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          <select
            defaultValue=""
            onChange={(e) => {
              handleBulkPriority(e.target.value as Task["priority"])
              e.target.value = ""
            }}
            disabled={taskPending}
            className="text-sm px-2 py-1.5 rounded-lg border border-border
             bg-card text-foreground dark:text-paper disabled:opacity-50"
          >
            <option value="" disabled>
              Set priority…
            </option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          <button
            onClick={handleBulkDelete}
            disabled={taskPending}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg text-rose-500
             hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-50"
          >
            {taskPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Delete
          </button>

          <button
            onClick={clearSelection}
            className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg ml-auto
             text-muted-foreground dark:text-paper/60 hover:bg-muted"
          >
            <X size={14} /> Clear
          </button>
        </div>
      )}

      {taskModal && (
        <CreateTaskModal
          key={taskModalKey}
          lists={lists}
          members={members}
          labels={labels}
          taskLabelIds={taskModal.task?.labels.map((l) => l.id)}
          isOwner={isOwner}
          onCreateLabel={isOwner ? handleCreateLabel : undefined}
          task={taskModal.task}
          defaultListId={taskModal.listId}
          isPending={taskPending}
          error={taskError}
          createAnother={createAnother}
          onCreateAnotherChange={setCreateAnother}
          onClose={() => setTaskModal(null)}
          onSubmit={handleTaskSubmit}
          onDelete={taskModal.task ? handleTaskDelete : undefined}
          currentUserId={taskModal.task ? currentUserId : undefined}
          comments={taskModal.task ? taskThread?.comments : undefined}
          activities={taskModal.task ? taskThread?.activities : undefined}
          onAddComment={handleAddComment}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
          commentPending={commentPending}
          commentError={threadError}
        />
      )}
    </div>
  )
}

const BoardColumn = memo(function BoardColumn({
  list,
  isSearching,
  memberNameById,
  selectedTaskIds,
  onToggleTaskSelection,
  onRename,
  onDelete,
  onAddTask,
  onTaskClick,
}: {
  list: ListWithTasks
  isSearching: boolean
  memberNameById: Map<string, string>
  selectedTaskIds: Set<string>
  onToggleTaskSelection: (taskId: string) => void
  onRename: (listId: string, name: string) => void
  onDelete: (listId: string) => void
  onAddTask: (listId: string) => void
  onTaskClick: (listId: string, task: TaskWithLabels) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: list.id,
    data: { type: "list" },
  })

  // Read this column's own pending flag straight from the store instead of
  // taking it as a prop. A prop here would mean any list's rename/delete
  // forces a new value down through KanbanBoard -> every BoardColumn,
  // defeating memo for columns that aren't the one changing. Subscribing
  // directly means only *this* column re-renders when *its* pending state
  // flips.
  const isColumnPending = useBoardStore((s) => s.pendingListIds.has(list.id))

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `${list.id}-dropzone`,
    data: { type: "column-dropzone", listId: list.id },
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(list.name)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }

  function commitRename() {
    setEditing(false)
    const trimmed = name.trim()
    if (trimmed && trimmed !== list.name) {
      onRename(list.id, trimmed)
    } else {
      setName(list.name)
    }
  }

  function handleDelete() {
    setMenuOpen(false)
    const message =
      list.tasks.length > 0
        ? `Delete "${list.name}" and its ${list.tasks.length} task(s)? This can't be undone.`
        : `Delete "${list.name}"? This can't be undone.`
    if (confirm(message)) onDelete(list.id)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="w-[85vw] max-w-[288px] sm:w-72 shrink-0 snap-start flex flex-col
                h-[58dvh]
              bg-muted rounded-2xl border
              border-border/80 dark:border-transparent"
    >
      <div className="flex items-center justify-between px-3 py-2 shrink-0">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab text-muted-foreground dark:text-paper/60 touch-none shrink-0 p-1 -m-1"
            aria-label="Drag to reorder column"
          >
            <GripVertical size={16} />
          </button>

          {editing ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename()
                if (e.key === "Escape") {
                  setName(list.name)
                  setEditing(false)
                }
              }}
              disabled={isColumnPending}
              maxLength={60}
              className="flex-1 min-w-0 px-2 py-1 text-sm font-semibold bg-card
               border border-primary rounded-lg"
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex-1 min-w-0 text-left truncate text-sm font-semibold text-foreground
               dark:text-paper"
            >
              {list.name}
            </button>
          )}

          <span className="text-xs text-muted-foreground dark:text-paper/60 shrink-0 pb-1 pr-2">
            {list.tasks.length}
          </span>
          {isSearching && (
            <span className="text-[10px] uppercase tracking-wide text-primary shrink-0 pb-1">
              matches
            </span>
          )}
          {isColumnPending && (
            <Loader2
              size={12}
              className="animate-spin text-primary shrink-0"
              aria-label="Saving column"
            />
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2 -m-1 rounded-lg hover:bg-card"
            >
              <MoreVertical size={14} className="text-muted-foreground dark:text-paper/60" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 mt-1 w-36 sm:w-32 bg-card border
             border-border rounded-xl shadow-lg z-10 overflow-hidden"
              >
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    setEditing(true)
                  }}
                  disabled={isColumnPending}
                  className="w-full flex items-center px-3 py-2.5 sm:py-2 text-sm text-foreground
                 dark:text-paper hover:bg-muted disabled:opacity-50"
                >
                  <Pencil size={14} className="mr-2" /> Rename
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isColumnPending}
                  className="w-full flex items-center px-3 py-2.5 sm:py-2 text-sm text-rose-500
                 hover:bg-muted disabled:opacity-50"
                >
                  <Trash2 size={14} className="mr-2" /> Delete
                </button>
              </div>
            )}
              <button
              onClick={() => onAddTask(list.id)}
              className="p-2 -m-1 rounded-lg hover:bg-card text-muted-foreground dark:text-paper/60 hover:text-primary"
              aria-label="Add task"
              title="Add task"
            >
              <Plus size={15} />
            </button>
          </div>
        </div>
      </div>

      <SortableContext items={list.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setDroppableRef}
          className="flex-1 min-h-[40px] overflow-y-auto overflow-x-hidden scrollbar-thin px-3 pb-3 space-y-2"
        >
          {list.tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground dark:text-paper/60 px-1 py-2">
              {isSearching ? "No matching tasks" : "No tasks yet"}
            </p>
          ) : isSearching ? (
            // if filter is active, tasks can't be dragged to avoid order scrambling
            list.tasks.map((task) => (
              <SearchResultTaskCard
                key={task.id}
                task={task}
                assigneeName={task.assigneeId ? memberNameById.get(task.assigneeId) : undefined}
                selected={selectedTaskIds.has(task.id)}
                onToggleSelect={() => onToggleTaskSelection(task.id)}
                onClick={() => onTaskClick(list.id, task)}
              />
            ))
          ) : (
            list.tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                assigneeName={task.assigneeId ? memberNameById.get(task.assigneeId) : undefined}
                selected={selectedTaskIds.has(task.id)}
                onToggleSelect={() => onToggleTaskSelection(task.id)}
                onClick={() => onTaskClick(list.id, task)}
              />
            ))
          )}

          <button
            onClick={() => onAddTask(list.id)}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-2.5 sm:py-1.5 text-xs
             text-muted-foreground dark:text-paper/60 hover:text-primary
              rounded-lg hover:bg-card transition-colors"
          >
            <Plus size={13} /> Add task
          </button>
        </div>
      </SortableContext>
    </div>
  )
})

const SortableTaskCard = memo(function SortableTaskCard({
  task,
  assigneeName,
  selected,
  onToggleSelect,
  onClick,
}: {
  task: TaskWithLabels
  assigneeName?: string
  selected?: boolean
  onToggleSelect?: () => void
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task" },
  })

  // Subscribed directly (not passed as a prop) so a pending change on one
  // task only re-renders that task's own card, not its whole column.
  const pending = useBoardStore((s) => s.pendingTaskIds.has(task.id))

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
      <TaskCard
        task={task}
        assigneeName={assigneeName}
        labels={task.labels}
        selected={selected}
        onToggleSelect={onToggleSelect}
        onClick={onClick}
        pending={pending}
      />
    </div>
  )
})

// Same idea as SortableTaskCard but without drag wiring, used for the
// non-draggable search-results list. Kept as its own memoized component
// (rather than inlining useBoardStore in the .map() above) so each card
// only re-renders for its own pending-state change.
const SearchResultTaskCard = memo(function SearchResultTaskCard({
  task,
  assigneeName,
  selected,
  onToggleSelect,
  onClick,
}: {
  task: TaskWithLabels
  assigneeName?: string
  selected?: boolean
  onToggleSelect?: () => void
  onClick: () => void
}) {
  const pending = useBoardStore((s) => s.pendingTaskIds.has(task.id))

  return (
    <TaskCard
      task={task}
      assigneeName={assigneeName}
      labels={task.labels}
      selected={selected}
      onToggleSelect={onToggleSelect}
      onClick={onClick}
      pending={pending}
    />
  )
})