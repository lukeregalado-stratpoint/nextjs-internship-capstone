"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  addMemberAction,
  addMemberByIdAction,
  searchMembersAction,
  updateMemberRoleAction,
  removeMemberAction,
} from "@/lib/actions/members"
import type { AddMemberByUserIdInput, AddMemberInput, UpdateMemberRoleInput } from "@/lib/validations"

export interface MemberSearchResult {
  id: string
  name: string
  email: string
}

export function useMembers(projectId: string) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

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
  }
}