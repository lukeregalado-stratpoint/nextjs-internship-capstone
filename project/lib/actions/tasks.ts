"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import {
  createTask as createTaskRow,
  deleteTask as deleteTaskRow,
  getNextTaskPosition,
  moveTask as moveTaskRow,
  ownsList,
  ownsTask,
  updateTask as updateTaskRow,
} from "@/lib/db/queries"
import { taskMoveSchema, taskSchema, taskUpdateSchema } from "@/lib/validations"
import type { Task } from "@/lib/db/schema"

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

export async function createTaskAction(
  projectId: string,
  input: unknown
): Promise<ActionResult<Task>> {
  const user = await requireUser()

  const parsed = taskSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const owns = await ownsList(parsed.data.listId, user.id)
  if (!owns) {
    return { success: false, error: "You don't have permission to add tasks to this column" }
  }

  const position = await getNextTaskPosition(parsed.data.listId)
  const task = await createTaskRow({ ...parsed.data, position })

  revalidatePath(`/projects/${projectId}`)

  return { success: true, data: task }
}

export async function updateTaskAction(
  taskId: string,
  projectId: string,
  input: unknown
): Promise<ActionResult<Task>> {
  const user = await requireUser()

  const owns = await ownsTask(taskId, user.id)
  if (!owns) {
    return { success: false, error: "You don't have permission to edit this task" }
  }

  const parsed = taskUpdateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { listId, ...fields } = parsed.data
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

  revalidatePath(`/projects/${projectId}`)

  return { success: true, data: task }
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