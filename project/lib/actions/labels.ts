"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import {
  createLabel as createLabelRow,
  deleteLabel as deleteLabelRow,
  getLabelsForProject,
  ownsLabel,
  ownsProject,
  updateLabel as updateLabelRow,
} from "@/lib/db/queries"
import { labelSchema, labelUpdateSchema } from "@/lib/validations"
import type { Label } from "@/lib/db/schema"

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

// Labels are project-scoped and owner-managed (see AL-Management practicum
// notes on project permissions) — members can apply labels to tasks via
// taskSchema.labelIds, but only the owner can create/rename/delete them.

export async function getLabelsAction(projectId: string): Promise<ActionResult<Label[]>> {
  const user = await requireUser()

  const owns = await ownsProject(projectId, user.id)
  if (!owns) {
    return { success: false, error: "You don't have permission to view this project's labels" }
  }

  const rows = await getLabelsForProject(projectId)
  return { success: true, data: rows }
}

export async function createLabelAction(
  projectId: string,
  input: unknown
): Promise<ActionResult<Label>> {
  const user = await requireUser()

  const owns = await ownsProject(projectId, user.id)
  if (!owns) {
    return { success: false, error: "Only the project owner can manage labels" }
  }

  const parsed = labelSchema.safeParse({ ...(input as object), projectId })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const label = await createLabelRow(parsed.data)

  revalidatePath(`/projects/${projectId}`)

  return { success: true, data: label }
}

export async function updateLabelAction(
  labelId: string,
  projectId: string,
  input: unknown
): Promise<ActionResult<Label>> {
  const user = await requireUser()

  const owns = await ownsLabel(labelId, user.id)
  if (!owns) {
    return { success: false, error: "Only the project owner can manage labels" }
  }

  const parsed = labelUpdateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const label = await updateLabelRow(labelId, parsed.data)
  if (!label) {
    return { success: false, error: "Label not found" }
  }

  revalidatePath(`/projects/${projectId}`)

  return { success: true, data: label }
}

export async function deleteLabelAction(
  labelId: string,
  projectId: string
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()

  const owns = await ownsLabel(labelId, user.id)
  if (!owns) {
    return { success: false, error: "Only the project owner can manage labels" }
  }

  await deleteLabelRow(labelId)

  revalidatePath(`/projects/${projectId}`)

  return { success: true, data: { id: labelId } }
}