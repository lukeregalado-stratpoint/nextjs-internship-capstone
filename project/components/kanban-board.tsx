"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
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
import { GripVertical, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react"
import { useLists } from "@/hooks/use-lists"
import { useTasks } from "@/hooks/use-tasks"
import { CreateTaskModal, type TaskFormSubmitValues } from "@/components/modals/create-task-modal"
import { TaskCard } from "@/components/task-card"
import { TaskSearchBar } from "@/components/task-search-bar"
import { useBoardStore, type ListWithTasks } from "@/stores/board-store"
import { filterTasks } from "@/lib/task-search"
import type { Task } from "@/lib/db/schema"

export function KanbanBoard({
  projectId,
  initialLists,
  members = [],
}: {
  projectId: string
  initialLists: ListWithTasks[]
  members?: { id: string; name: string }[]
}) {
  const { lists, setLists, createList, renameList, deleteList, reorderLists, isPending, error } =
    useLists(projectId)
  const {
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    isPending: taskPending,
    error: taskError,
  } = useTasks(projectId)
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState("")
  // `task` present = editing that task; absent = creating a new one in `listId`.
  const [taskModal, setTaskModal] = useState<{ listId: string; task?: Task } | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

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

  // hydrate
  useEffect(() => {
    setLists(initialLists)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function findListIdForTask(taskId: string) {
    return lists.find((l) => l.tasks.some((t) => t.id === taskId))?.id
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
    const overListId = findListIdForTask(overId) ?? overId // dropping in empty column space
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
      const destListId = findListIdForTask(overId) ?? overId
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

    if (!over || active.id === over.id) return
    const oldIndex = lists.findIndex((l) => l.id === active.id)
    const newIndex = lists.findIndex((l) => l.id === over.id)
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
        },
        () => setTaskModal(null)
      )
    } else if (taskModal) {
      createTask(
        {
          title: values.title,
          description: values.description,
          listId: values.listId ?? taskModal.listId,
          priority: values.priority,
          dueDate: values.dueDate,
        },
        () => setTaskModal(null)
      )
    }
  }

  function handleTaskDelete() {
    if (!taskModal?.task) return
    if (confirm(`Delete "${taskModal.task.title}"? This can't be undone.`)) {
      deleteTask(taskModal.task.id, () => setTaskModal(null))
    }
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-500">{error}</p>}
      {taskError && <p className="text-sm text-red-500">{taskError}</p>}

      <TaskSearchBar
        query={searchQuery}
        onQueryChange={setSearchQuery}
        memberNames={memberNames}
        matchCount={matchedTaskCount}
        totalCount={totalTaskCount}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={lists.map((l) => l.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex items-start gap-4 overflow-x-auto pb-4">
            {displayLists.map((list) => (
              <BoardColumn
                key={list.id}
                list={list}
                isPending={isPending}
                isSearching={isSearching}
                onRename={(name) => renameList(list.id, name)}
                onDelete={() => deleteList(list.id)}
                onAddTask={() => setTaskModal({ listId: list.id })}
                onTaskClick={(task) => setTaskModal({ listId: list.id, task })}
              />
            ))}

            <div className="w-72 shrink-0">
              {addingColumn ? (
                <form
                  onSubmit={handleAddColumn}
                  className="bg-lavender-50 dark:bg-paynes_gray-400/20 rounded-2xl p-3 space-y-2"
                >
                  <input
                    autoFocus
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    placeholder="Column name"
                    maxLength={60}
                    className="w-full px-3 py-2 border border-lavender-200 dark:border-paynes_gray-400
                     rounded-xl bg-white dark:bg-outer_space-500 text-outer_space-500 dark:text-platinum-500
                      focus:outline-none focus:ring-2 focus:ring-lavender-400"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isPending || !newColumnName.trim()}
                      className="px-3 py-1.5 text-sm rounded-xl bg-lavender-500 text-white hover:bg-lavender-600
                       disabled:opacity-50"
                    >
                      Add column
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddingColumn(false)
                        setNewColumnName("")
                      }}
                      className="px-3 py-1.5 text-sm rounded-xl border border-lavender-200 dark:border-paynes_gray-400
                       text-outer_space-500 dark:text-platinum-500"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setAddingColumn(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-lavender-200
                   dark:border-paynes_gray-400 rounded-2xl text-paynes_gray-500 dark:text-french_gray-400
                    hover:border-lavender-400 hover:text-lavender-600 hover:bg-lavender-50 transition-colors"
                >
                  <Plus size={16} /> Add column
                </button>
              )}
            </div>
          </div>
        </SortableContext>

        <DragOverlay>{activeTask ? <TaskCard task={activeTask} /> : null}</DragOverlay>
      </DndContext>

      {taskModal && (
        <CreateTaskModal
          lists={lists}
          task={taskModal.task}
          defaultListId={taskModal.listId}
          isPending={taskPending}
          error={taskError}
          onClose={() => setTaskModal(null)}
          onSubmit={handleTaskSubmit}
          onDelete={taskModal.task ? handleTaskDelete : undefined}
        />
      )}
    </div>
  )
}

function BoardColumn({
  list,
  isPending,
  isSearching,
  onRename,
  onDelete,
  onAddTask,
  onTaskClick,
}: {
  list: ListWithTasks
  isPending: boolean
  isSearching: boolean
  onRename: (name: string) => void
  onDelete: () => void
  onAddTask: () => void
  onTaskClick: (task: Task) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: list.id,
    data: { type: "list" },
  })

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: list.id,
    data: { type: "list" },
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
      onRename(trimmed)
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
    if (confirm(message)) onDelete()
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="w-72 shrink-0 bg-lavender-50 dark:bg-paynes_gray-400/20 rounded-2xl border
       border-lavender-100/80 dark:border-transparent"
    >
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab text-paynes_gray-500 dark:text-french_gray-400 touch-none"
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
              maxLength={60}
              className="flex-1 min-w-0 px-2 py-1 text-sm font-semibold bg-white dark:bg-outer_space-500
               border border-lavender-400 rounded-lg"
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex-1 min-w-0 text-left truncate text-sm font-semibold text-outer_space-500
               dark:text-platinum-500"
            >
              {list.name}
            </button>
          )}

          <span className="text-xs text-paynes_gray-500 dark:text-french_gray-400 shrink-0 pb-1">
            {list.tasks.length}
          </span>
          {isSearching && (
            <span className="text-[10px] uppercase tracking-wide text-lavender-500 shrink-0 pb-1">
              matches
            </span>
          )}
        </div>

        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1 rounded-lg hover:bg-white dark:hover:bg-outer_space-500"
          >
            <MoreVertical size={14} className="text-paynes_gray-500 dark:text-french_gray-400" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-outer_space-500 border
             border-lavender-100 dark:border-paynes_gray-400 rounded-xl shadow-lg z-10 overflow-hidden">
              <button
                onClick={() => {
                  setMenuOpen(false)
                  setEditing(true)
                }}
                className="w-full flex items-center px-3 py-2 text-sm text-outer_space-500
                 dark:text-platinum-500 hover:bg-lavender-50 dark:hover:bg-paynes_gray-400"
              >
                <Pencil size={14} className="mr-2" /> Rename
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="w-full flex items-center px-3 py-2 text-sm text-rose-500
                 hover:bg-lavender-50 dark:hover:bg-paynes_gray-400"
              >
                <Trash2 size={14} className="mr-2" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <SortableContext items={list.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setDroppableRef} className="px-3 pb-3 space-y-2 min-h-[40px]">
          {list.tasks.length === 0 ? (
            <p className="text-xs text-paynes_gray-500 dark:text-french_gray-400 px-1 py-2">
              {isSearching ? "No matching tasks" : "No tasks yet"}
            </p>
          ) : isSearching ? (
            // if filter is active, tasks can't be dragged to avoid order scrambling
            list.tasks.map((task) => (
              <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
            ))
          ) : (
            list.tasks.map((task) => (
              <SortableTaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
            ))
          )}

          <button
            onClick={onAddTask}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs
             text-paynes_gray-500 dark:text-french_gray-400 hover:text-lavender-600
              rounded-lg hover:bg-white dark:hover:bg-outer_space-500 transition-colors"
          >
            <Plus size={13} /> Add task
          </button>
        </div>
      </SortableContext>
    </div>
  )
}

function SortableTaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task" },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
      <TaskCard task={task} onClick={onClick} />
    </div>
  )
}