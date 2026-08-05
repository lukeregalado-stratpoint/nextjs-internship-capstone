"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import {
  createTask as createTaskRow,
  deleteTask as deleteTaskRow,
  getAssignableUserIds,
  getLabelsForTask,
  getNextTaskPosition,
  getProjectLabelIds,
  moveTask as moveTaskRow,
  ownsList,
  ownsTask,
  setTaskLabels,
  updateTask as updateTaskRow,
} from "@/lib/db/queries"
import { taskMoveSchema, taskSchema, taskUpdateSchema } from "@/lib/validations"
import type { Label, Task } from "@/lib/db/schema"

type TaskWithLabels = Task & { labels: Label[] }

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

export async function createTaskAction(
  projectId: string,
  input: unknown
): Promise<ActionResult<TaskWithLabels>> {
  const user = await requireUser()

  const parsed = taskSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const owns = await ownsList(parsed.data.listId, user.id)
  if (!owns) {
    return { success: false, error: "You don't have permission to add tasks to this column" }
  }

  if (parsed.data.assigneeId) {
    const assignableIds = await getAssignableUserIds(projectId)
    if (!assignableIds.includes(parsed.data.assigneeId)) {
      return { success: false, error: "Assignee must be a member of this project" }
    }
  }

  const { labelIds, ...taskFields } = parsed.data

  if (labelIds.length > 0) {
    const projectLabelIds = await getProjectLabelIds(projectId)
    if (!labelIds.every((id) => projectLabelIds.includes(id))) {
      return { success: false, error: "Labels must belong to this project" }
    }
  }

  const position = await getNextTaskPosition(parsed.data.listId)
  const task = await createTaskRow({ ...taskFields, position })
  await setTaskLabels(task.id, labelIds)
  const labels = await getLabelsForTask(task.id)

  revalidatePath(`/projects/${projectId}`)

  return { success: true, data: { ...task, labels } }
}

export async function updateTaskAction(
  taskId: string,
  projectId: string,
  input: unknown
): Promise<ActionResult<TaskWithLabels>> {
  const user = await requireUser()

  const owns = await ownsTask(taskId, user.id)
  if (!owns) {
    return { success: false, error: "You don't have permission to edit this task" }
  }

  const parsed = taskUpdateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  if (parsed.data.assigneeId) {
    const assignableIds = await getAssignableUserIds(projectId)
    if (!assignableIds.includes(parsed.data.assigneeId)) {
      return { success: false, error: "Assignee must be a member of this project" }
    }
  }

  if (parsed.data.labelIds && parsed.data.labelIds.length > 0) {
    const projectLabelIds = await getProjectLabelIds(projectId)
    if (!parsed.data.labelIds.every((id) => projectLabelIds.includes(id))) {
      return { success: false, error: "Labels must belong to this project" }
    }
  }

  const { listId, labelIds, ...fields } = parsed.data
  let updateData: Partial<Task> = fields

  // moving to a different column -> verify ownership of the destination and
  // re-slot the task at the end of it (drag-and-drop reordering uses
  // moveTaskAction/moveTask instead)
  if (listId) {
    const ownsDestList = await ownsList(listId, user.id)
    if (!ownsDestList) {
      return { success: false, error: "You don't have permission to move this task there" }
    }
    const position = await getNextTaskPosition(listId)
    updateData = { ...updateData, listId, position }
  }

  const task = await updateTaskRow(taskId, updateData)
  if (!task) {
    return { success: false, error: "Task not found" }
  }

  // undefined means "not included in this edit" -> leave labels as-is;
  // an explicit [] means "cleared" -> setTaskLabels handles both correctly
  // since it always replaces the full set.
  if (labelIds !== undefined) {
    await setTaskLabels(taskId, labelIds)
  }
  const labels = await getLabelsForTask(taskId)

  revalidatePath(`/projects/${projectId}`)

  return { success: true, data: { ...task, labels } }
}

export async function deleteTaskAction(
  taskId: string,
  projectId: string
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()

  const owns = await ownsTask(taskId, user.id)
  if (!owns) {
    return { success: false, error: "You don't have permission to delete this task" }
  }

  await deleteTaskRow(taskId)

  revalidatePath(`/projects/${projectId}`)

  return { success: true, data: { id: taskId } }
}

export async function moveTaskAction(
  projectId: string,
  input: unknown
): Promise<ActionResult<{ taskId: string }>> {
  const user = await requireUser()

  const parsed = taskMoveSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const [taskOwned, destListOwned] = await Promise.all([
    ownsTask(parsed.data.taskId, user.id),
    ownsList(parsed.data.destListId, user.id),
  ])
  if (!taskOwned || !destListOwned) {
    return { success: false, error: "You don't have permission to move this task" }
  }

  await moveTaskRow(parsed.data.taskId, parsed.data.destListId, parsed.data.orderedTaskIds)

  revalidatePath(`/projects/${projectId}`)

  return { success: true, data: { taskId: parsed.data.taskId } }
}