"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  addMemberAction,
  updateMemberRoleAction,
  removeMemberAction,
} from "@/lib/actions/members"
import type { AddMemberInput, UpdateMemberRoleInput } from "@/lib/validations"

export function useMembers(projectId: string) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

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

  return { isPending, error, addMember, updateMemberRole, removeMember }
}