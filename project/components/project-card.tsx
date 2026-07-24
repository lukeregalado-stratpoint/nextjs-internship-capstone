"use client"

import Link from "next/link"
import { useState } from "react"
import { Calendar, MoreHorizontal, Trash2 } from "lucide-react"
import type { Project } from "@/lib/db/schema"
import { useProjects } from "@/hooks/use-projects"

function formatDueDate(date: Date | null) {
  if (!date) return null
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function ProjectCard({ project }: { project: Project }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { deleteProject, isPending } = useProjects()

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (confirm(`Delete "${project.name}"? This can't be undone.`)) {
      deleteProject(project.id)
    }
    setMenuOpen(false)
  }

  return (
    <Link
      href={`/projects/${project.id}`}
      className="block bg-white dark:bg-outer_space-500 rounded-lg border border-french_gray-300 dark:border-paynes_gray-400 p-6 hover:shadow-lg transition-shadow relative"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-3 h-3 rounded-full bg-blue_munsell-500" />
        <div className="relative">
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setMenuOpen((v) => !v)
            }}
            className="p-1 hover:bg-platinum-500 dark:hover:bg-paynes_gray-400 rounded"
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-10 w-36 bg-white dark:bg-outer_space-400 border border-french_gray-300 dark:border-paynes_gray-400 rounded-lg shadow-lg py-1">
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-platinum-500 dark:hover:bg-paynes_gray-400"
              >
                <Trash2 size={14} className="mr-2" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <h3 className="text-lg font-semibold text-outer_space-500 dark:text-platinum-500 mb-2">
        {project.name}
      </h3>

      {project.description && (
        <p className="text-sm text-paynes_gray-500 dark:text-french_gray-400 mb-4 line-clamp-2">
          {project.description}
        </p>
      )}

      {project.dueDate && (
        <div className="flex items-center text-sm text-paynes_gray-500 dark:text-french_gray-400">
          <Calendar size={16} className="mr-1" />
          Due {formatDueDate(project.dueDate)}
        </div>
      )}
    </Link>
  )
}