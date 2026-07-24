"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowLeft, Pencil, Trash2 } from "lucide-react"
import { useProjects } from "@/hooks/use-projects"
import { EditProjectModal } from "@/components/modals/edit-project-modal"

interface ProjectHeaderData {
  id: string
  name: string
  description: string | null
  dueDate: Date | null
}

export function ProjectHeader({ project }: { project: ProjectHeaderData }) {
  const router = useRouter()
  const { deleteProject, isPending } = useProjects()
  const [editOpen, setEditOpen] = useState(false)

  function handleDelete() {
    if (confirm(`Delete "${project.name}"? This can't be undone.`)) {
      deleteProject(project.id, () => router.push("/projects"))
    }
  }

  return (
    <div className="space-y-2">
      <Link
        href="/projects"
        className="inline-flex items-center text-sm text-paynes_gray-500 dark:text-french_gray-400 hover:text-blue_munsell-500"
      >
        <ArrowLeft size={14} className="mr-1" /> Back to projects
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-outer_space-500 dark:text-platinum-500">
            {project.name}
          </h1>
          {project.description && (
            <p className="text-paynes_gray-500 dark:text-french_gray-500 mt-2 max-w-2xl">
              {project.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center px-3 py-2 border border-french_gray-300 dark:border-paynes_gray-400 text-outer_space-500 dark:text-platinum-500 rounded-lg hover:bg-platinum-500 dark:hover:bg-paynes_gray-400 transition-colors"
          >
            <Pencil size={16} className="mr-2" /> Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="inline-flex items-center px-3 py-2 border border-red-300 text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 size={16} className="mr-2" /> Delete
          </button>
        </div>
      </div>

      <EditProjectModal project={project} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  )
}
