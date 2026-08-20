"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  acceptInvitationAction,
  declineInvitationAction,
  acceptInvitationForProjectAction,
  declineInvitationForProjectAction,
} from "@/lib/actions/invitations"

/**
 * Accept/decline for a single project_invitation notification. Kept
 * separate from useMembers (owner-side invite/revoke) since this acts as
 * the invitee, not the project owner — different actor, different checks.
 */
export function useInvitations() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function acceptInvitation(invitationId: string, onSuccess?: (projectId: string) => void) {
    setError(null)
    startTransition(async () => {
      const result = await acceptInvitationAction({ invitationId })
      if (!result.success) {
        setError(result.error)
        return
      }
      router.refresh()
      onSuccess?.(result.data.projectId)
    })
  }

  function declineInvitation(invitationId: string, onSuccess?: () => void) {
    setError(null)
    startTransition(async () => {
      const result = await declineInvitationAction({ invitationId })
      if (!result.success) {
        setError(result.error)
        return
      }
      router.refresh()
      onSuccess?.()
    })
  }

  // For the notification bell: a project_invitation notification only
  // carries a projectId, not an invitationId — see the *ForProjectAction
  // comment in lib/actions/invitations.ts for why that's still safe.
  function acceptInvitationForProject(projectId: string, onSuccess?: (projectId: string) => void) {
    setError(null)
    startTransition(async () => {
      const result = await acceptInvitationForProjectAction(projectId)
      if (!result.success) {
        setError(result.error)
        return
      }
      router.refresh()
      onSuccess?.(result.data.projectId)
    })
  }

  function declineInvitationForProject(projectId: string, onSuccess?: () => void) {
    setError(null)
    startTransition(async () => {
      const result = await declineInvitationForProjectAction(projectId)
      if (!result.success) {
        setError(result.error)
        return
      }
      router.refresh()
      onSuccess?.()
    })
  }

  return {
    isPending,
    error,
    acceptInvitation,
    declineInvitation,
    acceptInvitationForProject,
    declineInvitationForProject,
  }
}