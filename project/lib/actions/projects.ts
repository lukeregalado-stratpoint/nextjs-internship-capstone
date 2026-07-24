"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { projectSchema, projectUpdateSchema } from "@/lib/validations"
import {
  createProject as createProjectRow,
  updateProject as updateProjectRow,
  deleteProject as deleteProjectRow,
  ownsProject,
} from "@/lib/db/queries"
import type { Project } from "@/lib/db/schema"

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function createProjectAction(
  input: unknown
): Promise<ActionResult<Project>> {
  const user = await requireUser()

  const parsed = projectSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const project = await createProjectRow({
    ...parsed.data,
    ownerId: user.id,
  })

  revalidatePath("/projects")
  revalidatePath("/dashboard")

  return { success: true, data: project }
}

export async function updateProjectAction(
  projectId: string,
  input: unknown
): Promise<ActionResult<Project>> {
  const user = await requireUser()

  const owns = await ownsProject(projectId, user.id)
  if (!owns) {
    return { success: false, error: "You don't have permission to edit this project" }
  }

  const parsed = projectUpdateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const project = await updateProjectRow(projectId, parsed.data)
  if (!project) {
    return { success: false, error: "Project not found" }
  }

  revalidatePath("/projects")
  revalidatePath(`/projects/${projectId}`)
  revalidatePath("/dashboard")

  return { success: true, data: project }
}

export async function deleteProjectAction(
  projectId: string
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()

  const owns = await ownsProject(projectId, user.id)
  if (!owns) {
    return { success: false, error: "You don't have permission to delete this project" }
  }

  await deleteProjectRow(projectId)

  revalidatePath("/projects")
  revalidatePath("/dashboard")

  return { success: true, data: { id: projectId } }
}