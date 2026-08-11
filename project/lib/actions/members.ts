"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import {
  addMemberSchema,
  addMemberByUserIdSchema,
  searchMembersSchema,
  updateMemberRoleSchema,
} from "@/lib/validations"
import {
  ownsProject,
  findUserByEmail,
  getUserById,
  searchUsersForProject,
  getProjectMember,
  getProjectMemberById,
  addProjectMember,
  updateProjectMemberRole as updateProjectMemberRoleRow,
  removeProjectMember as removeProjectMemberRow,
} from "@/lib/db/queries"
import type { ProjectMember } from "@/lib/db/schema"

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

type MemberWithUser = ProjectMember & {
  user: { id: string; name: string; email: string }
}

// Membership management is owner-only. Members (any role) can view and work
// in a project, but only the owner can add/remove people or change roles —
// see getAccessibleProjectIds / canAccessProject for the view-side rule.

export async function addMemberAction(input: unknown): Promise<ActionResult<MemberWithUser>> {
  const user = await requireUser()

  const parsed = addMemberSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  const { projectId, email, role } = parsed.data

  const owns = await ownsProject(projectId, user.id)
  if (!owns) {
    return { success: false, error: "Only the project owner can add members" }
  }

  const invitee = await findUserByEmail(email)
  if (!invitee) {
    return {
      success: false,
      error: "No user found with that email. They need to sign up first.",
    }
  }

  if (invitee.id === user.id) {
    return { success: false, error: "You're already the owner of this project" }
  }

  const existing = await getProjectMember(projectId, invitee.id)
  if (existing) {
    return { success: false, error: "This person is already a member of the project" }
  }

  const member = await addProjectMember({ projectId, userId: invitee.id, role })

  revalidatePath(`/projects/${projectId}`)
  revalidatePath("/projects")
  revalidatePath("/team")

  return {
    success: true,
    data: { ...member, user: { id: invitee.id, name: invitee.name, email: invitee.email } },
  }
}

/**
 * Powers the "add member" autocomplete: registered users matching the
 * typed name/email, already filtered to exclude the owner and existing
 * members. Owner-only, same as adding — this intentionally does not
 * expose a global directory search, only "who could I add to *this*
 * project right now".
 */
export async function searchMembersAction(input: unknown): Promise<ActionResult<
  { id: string; name: string; email: string }[]
>> {
  const user = await requireUser()

  const parsed = searchMembersSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  const { projectId, query } = parsed.data

  const owns = await ownsProject(projectId, user.id)
  if (!owns) {
    return { success: false, error: "Only the project owner can search for members" }
  }

  const results = await searchUsersForProject(projectId, query)
  return { success: true, data: results }
}

/**
 * Adds a member picked from the autocomplete results (searchMembersAction),
 * so we already know their userId rather than re-resolving an email. Same
 * checks as addMemberAction otherwise — kept as a separate action rather
 * than overloading addMemberSchema so each stays a simple, single-shaped input.
 */
export async function addMemberByIdAction(input: unknown): Promise<ActionResult<MemberWithUser>> {
  const user = await requireUser()

  const parsed = addMemberByUserIdSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  const { projectId, userId, role } = parsed.data

  const owns = await ownsProject(projectId, user.id)
  if (!owns) {
    return { success: false, error: "Only the project owner can add members" }
  }

  if (userId === user.id) {
    return { success: false, error: "You're already the owner of this project" }
  }

  const invitee = await getUserById(userId)
  if (!invitee) {
    return { success: false, error: "That user no longer exists" }
  }

  const existing = await getProjectMember(projectId, invitee.id)
  if (existing) {
    return { success: false, error: "This person is already a member of the project" }
  }

  const member = await addProjectMember({ projectId, userId: invitee.id, role })

  revalidatePath(`/projects/${projectId}`)
  revalidatePath("/projects")
  revalidatePath("/team")

  return {
    success: true,
    data: { ...member, user: { id: invitee.id, name: invitee.name, email: invitee.email } },
  }
}

export async function updateMemberRoleAction(
  projectId: string,
  memberId: string,
  input: unknown
): Promise<ActionResult<ProjectMember>> {
  const user = await requireUser()

  const owns = await ownsProject(projectId, user.id)
  if (!owns) {
    return { success: false, error: "Only the project owner can change member roles" }
  }

  const parsed = updateMemberRoleSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const existingMember = await getProjectMemberById(memberId)
  if (!existingMember || existingMember.projectId !== projectId) {
    return { success: false, error: "Member not found" }
  }

  const member = await updateProjectMemberRoleRow(memberId, parsed.data.role)
  if (!member) {
    return { success: false, error: "Member not found" }
  }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath("/team")

  return { success: true, data: member }
}

export async function removeMemberAction(
  projectId: string,
  memberId: string
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()

  const owns = await ownsProject(projectId, user.id)
  if (!owns) {
    return { success: false, error: "Only the project owner can remove members" }
  }

  const existingMember = await getProjectMemberById(memberId)
  if (!existingMember || existingMember.projectId !== projectId) {
    return { success: false, error: "Member not found" }
  }

  await removeProjectMemberRow(memberId)

  revalidatePath(`/projects/${projectId}`)
  revalidatePath("/projects")
  revalidatePath("/team")

  return { success: true, data: { id: memberId } }
}