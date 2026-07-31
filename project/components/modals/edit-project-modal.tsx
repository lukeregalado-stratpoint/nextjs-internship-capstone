"use client"

import { useEffect, useState, type FormEvent } from "react"
import { X } from "lucide-react"
import { useProjects } from "@/hooks/use-projects"

interface EditableProject {
  id: string
  name: string
  description: string | null
  dueDate: Date | null
}

export function EditProjectModal({
  project,
  open,
  onOpenChange,
}: {
  project: EditableProject
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { updateProject, isPending, error } = useProjects()
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description ?? "")
  const [dueDate, setDueDate] = useState(
    project.dueDate ? new Date(project.dueDate).toISOString().slice(0, 10) : ""
  )

  useEffect(() => {
    if (open) {
      setName(project.name)
      setDescription(project.description ?? "")
      setDueDate(project.dueDate ? new Date(project.dueDate).toISOString().slice(0, 10) : "")
    }
  }, [open, project])

  if (!open) return null

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    updateProject(
      project.id,
      {
        name,
        description: description || undefined,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      () => onOpenChange(false)
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-white/20 dark:bg-black/20 p-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-outer_space-500 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-outer_space-500 dark:text-platinum-500">
            Edit Project
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1 rounded-full hover:bg-lavender-50 dark:hover:bg-paynes_gray-500/20 text-paynes_gray-500 dark:text-french_gray-400"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-outer_space-500 dark:text-platinum-500 mb-1">
              Name
            </label>
            <input
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-french_gray-300 dark:border-paynes_gray-400 rounded-xl bg-white dark:bg-outer_space-500 text-outer_space-500 dark:text-platinum-500 focus:outline-none focus:ring-2 focus:ring-lavender-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-outer_space-500 dark:text-platinum-500 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full px-3 py-2 border border-french_gray-300 dark:border-paynes_gray-400 rounded-xl bg-white dark:bg-outer_space-500 text-outer_space-500 dark:text-platinum-500 focus:outline-none focus:ring-2 focus:ring-lavender-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-outer_space-500 dark:text-platinum-500 mb-1">
              Due date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-french_gray-300 dark:border-paynes_gray-400 rounded-xl bg-white dark:bg-outer_space-500 text-outer_space-500 dark:text-platinum-500 focus:outline-none focus:ring-2 focus:ring-lavender-400"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-xl border border-french_gray-300 dark:border-paynes_gray-400 text-outer_space-500 dark:text-platinum-500 hover:bg-platinum-500 dark:hover:bg-paynes_gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="px-4 py-2 rounded-xl bg-lavender-500 text-white hover:bg-lavender-600 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}