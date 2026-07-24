"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { projectSchema } from "@/lib/validations"
import { useProjects } from "@/hooks/use-projects"

export function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const { createProject, isPending, error } = useProjects()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [fieldError, setFieldError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFieldError(null)

    const parsed = projectSchema.safeParse({
      name,
      description: description || undefined,
      dueDate: dueDate || undefined,
    })

    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Invalid input")
      return
    }

    createProject(parsed.data, () => onClose())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-outer_space-500 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-outer_space-500 dark:text-platinum-500">
            Create New Project
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-platinum-500 dark:hover:bg-paynes_gray-400 rounded">
            <X size={20} />
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-outer_space-500 dark:text-platinum-500 mb-2">
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-french_gray-300 dark:border-paynes_gray-400 rounded-lg bg-white dark:bg-outer_space-400 text-outer_space-500 dark:text-platinum-500 focus:outline-none focus:ring-2 focus:ring-blue_munsell-500"
              placeholder="Enter project name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-outer_space-500 dark:text-platinum-500 mb-2">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-french_gray-300 dark:border-paynes_gray-400 rounded-lg bg-white dark:bg-outer_space-400 text-outer_space-500 dark:text-platinum-500 focus:outline-none focus:ring-2 focus:ring-blue_munsell-500"
              placeholder="Project description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-outer_space-500 dark:text-platinum-500 mb-2">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-french_gray-300 dark:border-paynes_gray-400 rounded-lg bg-white dark:bg-outer_space-400 text-outer_space-500 dark:text-platinum-500 focus:outline-none focus:ring-2 focus:ring-blue_munsell-500"
            />
          </div>

          {(fieldError || error) && <p className="text-sm text-red-600">{fieldError ?? error}</p>}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-paynes_gray-500 dark:text-french_gray-400 hover:bg-platinum-500 dark:hover:bg-paynes_gray-400 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-blue_munsell-500 text-white rounded-lg hover:bg-blue_munsell-600 transition-colors disabled:opacity-50"
            >
              {isPending ? "Creating…" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}