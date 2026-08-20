"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { notifyUser } from "@/lib/notifications"
import { invitationIdSchema } from "@/lib/validations"
import {
  getInvitationById,
  getPendingInvitation,
  getPendingInvitationsForUser,
  updateInvitationStatus,
  addProjectMember,
  getProjectMember,
} from "@/lib/db/queries"
import { z } from "zod"
import type { ProjectInvitation } from "@/lib/db/schema"

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

type InvitationWithContext = ProjectInvitation & {
  project: { id: string; name: string }
  inviter: { id: string; name: string; email: string }
}

/** Invites addressed to the current user — powers a pending-invites list/badge. */
export async function getMyInvitationsAction(): Promise<ActionResult<InvitationWithContext[]>> {
  const user = await requireUser()
  const invitations = await getPendingInvitationsForUser(user.id)
  return { success: true, data: invitations }
}

/**
 * The only place a project_invitations row turns into a real
 * project_members row. Re-checks the invite is still pending and actually
 * addressed to this user — a stale notification link (already responded
 * to, or since revoked) fails cleanly instead of double-adding someone.
 */
export async function acceptInvitationAction(input: unknown): Promise<ActionResult<{ projectId: string }>> {
  const user = await requireUser()

  const parsed = invitationIdSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  const { invitationId } = parsed.data

  const invite = await getInvitationById(invitationId)
  if (!invite || invite.inviteeId !== user.id) {
    return { success: false, error: "Invitation not found" }
  }
  if (invite.status !== "pending") {
    return { success: false, error: "This invitation has already been responded to" }
  }

  // Guards against a race where the owner re-added the person some other
  // way while the invite sat unopened.
  const existingMember = await getProjectMember(invite.projectId, user.id)
  if (!existingMember) {
    await addProjectMember({ projectId: invite.projectId, userId: user.id, role: invite.role })
  }

  await updateInvitationStatus(invitationId, "accepted")

  try {
    await notifyUser({
      recipientId: invite.inviterId,
      actorId: user.id,
      type: "project_invitation",
      projectId: invite.projectId,
      title: `${invite.invitee.name} accepted your invitation to "${invite.project.name}"`,
    })
  } catch (err) {
    console.error("Failed to notify inviter of invitation acceptance", err)
  }

  revalidatePath(`/projects/${invite.projectId}`)
  revalidatePath("/projects")
  revalidatePath("/team")
  revalidatePath("/dashboard")

  return { success: true, data: { projectId: invite.projectId } }
}

export async function declineInvitationAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()

  const parsed = invitationIdSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  const { invitationId } = parsed.data

  const invite = await getInvitationById(invitationId)
  if (!invite || invite.inviteeId !== user.id) {
    return { success: false, error: "Invitation not found" }
  }
  if (invite.status !== "pending") {
    return { success: false, error: "This invitation has already been responded to" }
  }

  await updateInvitationStatus(invitationId, "declined")

  revalidatePath("/dashboard")

  return { success: true, data: { id: invitationId } }
}

const projectIdSchema = z.string().uuid()

/**
 * project_invitation notifications only carry a projectId, not an
 * invitationId (the notifications table isn't invitation-specific). The
 * unique (projectId, inviteeId) index on project_invitations means there's
 * at most one pending invite for "this project, this recipient", so we can
 * resolve it that way instead of adding a dedicated FK column just for the
 * notification bell's Accept/Decline buttons.
 */
export async function acceptInvitationForProjectAction(
  projectId: unknown
): Promise<ActionResult<{ projectId: string }>> {
  const user = await requireUser()

  const parsedProjectId = projectIdSchema.safeParse(projectId)
  if (!parsedProjectId.success) {
    return { success: false, error: "Invalid project" }
  }

  const invite = await getPendingInvitation(parsedProjectId.data, user.id)
  if (!invite) {
    return { success: false, error: "No pending invitation found for this project" }
  }

  return acceptInvitationAction({ invitationId: invite.id })
}

export async function declineInvitationForProjectAction(
  projectId: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()

  const parsedProjectId = projectIdSchema.safeParse(projectId)
  if (!parsedProjectId.success) {
    return { success: false, error: "Invalid project" }
  }

  const invite = await getPendingInvitation(parsedProjectId.data, user.id)
  if (!invite) {
    return { success: false, error: "No pending invitation found for this project" }
  }

  return declineInvitationAction({ invitationId: invite.id })
}