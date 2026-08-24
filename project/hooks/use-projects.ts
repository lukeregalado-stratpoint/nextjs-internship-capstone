"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  createProjectAction,
  updateProjectAction,
  deleteProjectAction,
} from "@/lib/actions/projects"
import type { ProjectInput, ProjectUpdateInput } from "@/lib/validations"

export function useProjects() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function createProject(input: ProjectInput, onSuccess?: () => void) {
    setError(null)
    startTransition(async () => {
      const result = await createProjectAction(input)
      if (!result.success) {
        setError(result.error)
        return
      }
      router.refresh()
      onSuccess?.()
      router.push(`/projects/${result.data.id}`)
    })
  }

  function updateProject(id: string, input: ProjectUpdateInput, onSuccess?: () => void) {
    setError(null)
    startTransition(async () => {
      const result = await updateProjectAction(id, input)
      if (!result.success) {
        setError(result.error)
        return
      }
      router.refresh()
      onSuccess?.()
    })
  }

  function deleteProject(id: string, onSuccess?: () => void) {
    setError(null)
    startTransition(async () => {
      const result = await deleteProjectAction(id)
      if (!result.success) {
        setError(result.error)
        return
      }
      router.refresh()
      onSuccess?.()
    })
  }

  return { isPending, error, createProject, updateProject, deleteProject }
}