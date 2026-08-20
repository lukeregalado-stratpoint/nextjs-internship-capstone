"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { notifyUser } from "@/lib/notifications"
import {
  addMemberSchema,
  addMemberByUserIdSchema,
  invitationIdSchema,
  searchMembersSchema,
  updateMemberRoleSchema,
} from "@/lib/validations"
import {
  ownsProject,
  findUserByEmail,
  getUserById,
  getProjectSummary,
  searchUsersForProject,
  getProjectMember,
  getProjectMemberById,
  getPendingInvitation,
  getPendingInvitationsForProject,
  getInvitationById,
  createOrRefreshInvitation,
  deleteInvitation,
  updateProjectMemberRole as updateProjectMemberRoleRow,
  removeProjectMember as removeProjectMemberRow,
} from "@/lib/db/queries"
import type { ProjectInvitation, ProjectMember } from "@/lib/db/schema"

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

type InvitationWithInvitee = ProjectInvitation & {
  invitee: { id: string; name: string; email: string }
}

// Membership management is owner-only. Members (any role) can view and work
// in a project, but only the owner can add/remove people or change roles —
// see getAccessibleProjectIds / canAccessProject for the view-side rule.
//
// "Adding" someone no longer inserts a project_members row directly: it
// creates a pending project_invitations row and notifies the invitee (see
// inviteUserToProject below). The row only becomes real membership once
// they accept it — see acceptInvitationAction in lib/actions/invitations.ts.
// This keeps someone from being silently dropped into a project's
// boards/tasks without agreeing to join it.

/** Shared by addMemberAction/addMemberByIdAction once the invitee is resolved. */
async function inviteUserToProject(
  projectId: string,
  inviter: { id: string; name: string },
  invitee: { id: string; name: string; email: string },
  role: ProjectMember["role"]
): Promise<ActionResult<InvitationWithInvitee>> {
  if (invitee.id === inviter.id) {
    return { success: false, error: "You're already the owner of this project" }
  }

  const existingMember = await getProjectMember(projectId, invitee.id)
  if (existingMember) {
    return { success: false, error: "This person is already a member of the project" }
  }

  const existingInvite = await getPendingInvitation(projectId, invitee.id)
  if (existingInvite) {
    return { success: false, error: "This person already has a pending invitation" }
  }

  const invitation = await createOrRefreshInvitation({
    projectId,
    inviterId: inviter.id,
    inviteeId: invitee.id,
    role,
  })

  const project = await getProjectSummary(projectId)
  try {
    await notifyUser({
      recipientId: invitee.id,
      actorId: inviter.id,
      type: "project_invitation",
      projectId,
      title: `${inviter.name} invited you to join "${project?.name ?? "a project"}"`,
      body: `Role: ${role.replace("_", " ")}`,
    })
  } catch (err) {
    // Best-effort, same as every other notifyUser call site — a failed
    // notification shouldn't fail the invitation itself. The invitee will
    // still see it via getPendingInvitationsForUser on next load.
    console.error("Failed to notify invitee of project invitation", err)
  }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath("/projects")
  revalidatePath("/team")

  return {
    success: true,
    data: { ...invitation, invitee },
  }
}

export async function addMemberAction(input: unknown): Promise<ActionResult<InvitationWithInvitee>> {
  const user = await requireUser()

  const parsed = addMemberSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  const { projectId, email, role } = parsed.data

  const owns = await ownsProject(projectId, user.id)
  if (!owns) {
    return { success: false, error: "Only the project owner can invite members" }
  }

  const invitee = await findUserByEmail(email)
  if (!invitee) {
    return {
      success: false,
      error: "No user found with that email. They need to sign up first.",
    }
  }

  // requireUser() is an auth-session shape, not necessarily a full users
  // row — resolve the actual row so we have a display name for the
  // notification title, same as we already look invitee up by row.
  const inviter = await getUserById(user.id)
  if (!inviter) {
    return { success: false, error: "Your account could not be found" }
  }

  return inviteUserToProject(projectId, inviter, invitee, role)
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
export async function addMemberByIdAction(
  input: unknown
): Promise<ActionResult<InvitationWithInvitee>> {
  const user = await requireUser()

  const parsed = addMemberByUserIdSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  const { projectId, userId, role } = parsed.data

  const owns = await ownsProject(projectId, user.id)
  if (!owns) {
    return { success: false, error: "Only the project owner can invite members" }
  }

  const invitee = await getUserById(userId)
  if (!invitee) {
    return { success: false, error: "That user no longer exists" }
  }

  const inviter = await getUserById(user.id)
  if (!inviter) {
    return { success: false, error: "Your account could not be found" }
  }

  return inviteUserToProject(projectId, inviter, invitee, role)
}

/** Owner-side list of outstanding invites, for the manage-members modal. */
export async function getPendingInvitationsAction(
  projectId: string
): Promise<ActionResult<InvitationWithInvitee[]>> {
  const user = await requireUser()

  const owns = await ownsProject(projectId, user.id)
  if (!owns) {
    return { success: false, error: "Only the project owner can view invitations" }
  }

  const invitations = await getPendingInvitationsForProject(projectId)
  return { success: true, data: invitations }
}

/** Owner cancelling a still-pending invite. Does nothing to project_members. */
export async function revokeInvitationAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()

  const parsed = invitationIdSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  const { invitationId } = parsed.data

  const invite = await getInvitationById(invitationId)
  if (!invite) {
    return { success: false, error: "Invitation not found" }
  }

  const owns = await ownsProject(invite.projectId, user.id)
  if (!owns) {
    return { success: false, error: "Only the project owner can revoke invitations" }
  }

  if (invite.status !== "pending") {
    return { success: false, error: "This invitation has already been responded to" }
  }

  await deleteInvitation(invitationId)

  revalidatePath(`/projects/${invite.projectId}`)
  revalidatePath("/team")

  return { success: true, data: { id: invitationId } }
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