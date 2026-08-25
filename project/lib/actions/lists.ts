"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import {
  createList as createListRow,
  deleteList as deleteListRow,
  getNextListPosition,
  getProjectRole,
  getProjectRoleForList,
  reorderLists as reorderListsRow,
  updateList as updateListRow,
} from "@/lib/db/queries"
import { hasPermission } from "@/lib/permissions"
import { listReorderSchema, listSchema, listUpdateSchema } from "@/lib/validations"
import type { List } from "@/lib/db/schema"

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

export async function createListAction(input: unknown): Promise<ActionResult<List>> {
  const user = await requireUser()

  const parsed = listSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const role = await getProjectRole(parsed.data.projectId, user.id)
  if (!hasPermission(role, "list:manage")) {
    return { success: false, error: "You don't have permission to add columns to this project" }
  }

  const position = await getNextListPosition(parsed.data.projectId)
  const list = await createListRow({ ...parsed.data, position })

  revalidatePath(`/projects/${parsed.data.projectId}`)

  return { success: true, data: list }
}

export async function updateListAction(
  listId: string,
  projectId: string,
  input: unknown
): Promise<ActionResult<List>> {
  const user = await requireUser()

  const role = await getProjectRoleForList(listId, user.id)
  if (!hasPermission(role, "list:manage")) {
    return { success: false, error: "You don't have permission to edit this column" }
  }

  const parsed = listUpdateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const list = await updateListRow(listId, parsed.data)
  if (!list) {
    return { success: false, error: "Column not found" }
  }

  

  return { success: true, data: list }
}

export async function deleteListAction(
  listId: string,
  projectId: string
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()

  const role = await getProjectRoleForList(listId, user.id)
  if (!hasPermission(role, "list:manage")) {
    return { success: false, error: "You don't have permission to delete this column" }
  }

  await deleteListRow(listId)

  

  return { success: true, data: { id: listId } }
}

export async function reorderListsAction(
  input: unknown
): Promise<ActionResult<{ orderedListIds: string[] }>> {
  const user = await requireUser()

  const parsed = listReorderSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const role = await getProjectRole(parsed.data.projectId, user.id)
  if (!hasPermission(role, "list:manage")) {
    return { success: false, error: "You don't have permission to reorder columns in this project" }
  }

  await reorderListsRow(parsed.data.projectId, parsed.data.orderedListIds)

  revalidatePath(`/projects/${parsed.data.projectId}`)

  return { success: true, data: { orderedListIds: parsed.data.orderedListIds } }
}