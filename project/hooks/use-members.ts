"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  addMemberAction,
  addMemberByIdAction,
  getPendingInvitationsAction,
  revokeInvitationAction,
  searchMembersAction,
  updateMemberRoleAction,
  removeMemberAction,
} from "@/lib/actions/members"
import type { AddMemberByUserIdInput, AddMemberInput, UpdateMemberRoleInput } from "@/lib/validations"
import type { ProjectInvitation } from "@/lib/db/schema"

export interface MemberSearchResult {
  id: string
  name: string
  email: string
}

export type PendingInvitation = ProjectInvitation & {
  invitee: { id: string; name: string; email: string }
}

export function useMembers(projectId: string) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Loaded client-side rather than threaded through as a server prop, so
  // adopting this hook doesn't require every page that renders
  // ManageMembersModal to also fetch+pass invitations.
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [invitationsLoaded, setInvitationsLoaded] = useState(false)

  const refreshInvitations = useCallback(() => {
    getPendingInvitationsAction(projectId).then((result) => {
      setInvitationsLoaded(true)
      if (result.success) setPendingInvitations(result.data)
    })
  }, [projectId])

  useEffect(() => {
    refreshInvitations()
  }, [refreshInvitations])

  // Search runs independently of the mutation `isPending`/`error` state
  // above — a slow or failed search shouldn't disable the Add button or
  // surface as a form error, it just clears the suggestion list.
  const [searchResults, setSearchResults] = useState<MemberSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchRequestId = useRef(0)

  function searchMembers(query: string) {
    const trimmed = query.trim()
    if (!trimmed) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    const requestId = ++searchRequestId.current
    setIsSearching(true)
    ;(async () => {
      const result = await searchMembersAction({ projectId, query: trimmed })
      // Ignore stale responses from an earlier keystroke that resolves late.
      if (requestId !== searchRequestId.current) return
      setIsSearching(false)
      setSearchResults(result.success ? result.data : [])
    })()
  }

  function clearSearch() {
    searchRequestId.current++
    setSearchResults([])
    setIsSearching(false)
  }

  function addMember(input: AddMemberInput, onSuccess?: () => void) {
    setError(null)
    startTransition(async () => {
      const result = await addMemberAction(input)
      if (!result.success) {
        setError(result.error)
        return
      }
      refreshInvitations()
      router.refresh()
      onSuccess?.()
    })
  }

  function addMemberById(input: AddMemberByUserIdInput, onSuccess?: () => void) {
    setError(null)
    startTransition(async () => {
      const result = await addMemberByIdAction(input)
      if (!result.success) {
        setError(result.error)
        return
      }
      clearSearch()
      refreshInvitations()
      router.refresh()
      onSuccess?.()
    })
  }

  function revokeInvitation(invitationId: string, onSuccess?: () => void) {
    setError(null)
    startTransition(async () => {
      const result = await revokeInvitationAction({ invitationId })
      if (!result.success) {
        setError(result.error)
        return
      }
      refreshInvitations()
      router.refresh()
      onSuccess?.()
    })
  }

  function updateMemberRole(
    memberId: string,
    input: UpdateMemberRoleInput,
    onSuccess?: () => void
  ) {
    setError(null)
    startTransition(async () => {
      const result = await updateMemberRoleAction(projectId, memberId, input)
      if (!result.success) {
        setError(result.error)
        return
      }
      router.refresh()
      onSuccess?.()
    })
  }

  function removeMember(memberId: string, onSuccess?: () => void) {
    setError(null)
    startTransition(async () => {
      const result = await removeMemberAction(projectId, memberId)
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
    addMember,
    addMemberById,
    updateMemberRole,
    removeMember,
    searchMembers,
    clearSearch,
    searchResults,
    isSearching,
    pendingInvitations,
    invitationsLoaded,
    revokeInvitation,
  }
}