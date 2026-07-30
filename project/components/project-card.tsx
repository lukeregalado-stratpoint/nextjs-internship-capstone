"use client"

import Link from "next/link"
import { useState } from "react"
import { ListTodo, MoreVertical, Pencil, Trash2, Users } from "lucide-react"
import { useProjects } from "@/hooks/use-projects"
import { EditProjectModal } from "@/components/modals/edit-project-modal"

export interface ProjectCardData {
  id: string
  name: string
  description: string | null
  dueDate: Date | null
  memberCount: number
  taskCount: number
  listCount: number
  progress: number
}

function daysLeft(dueDate: Date | null) {
  if (!dueDate) return null
  return Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000)
}

export function ProjectCard({ project }: { project: ProjectCardData }) {
  const { deleteProject, isPending } = useProjects()
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const days = daysLeft(project.dueDate)

  function handleDelete() {
    setMenuOpen(false)
    if (confirm(`Delete "${project.name}"? This can't be undone.`)) {
      deleteProject(project.id)
    }
  }

  return (
    <div className="relative bg-white dark:bg-outer_space-500 rounded-2xl border border-lavender-100 dark:border-paynes_gray-400 p-6 hover:shadow-md hover:border-lavender-200 transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="w-3 h-3 bg-lavender-500 rounded-full mt-1" />

        <div className="flex items-center gap-2">
          {days !== null && (
            <span className="text-sm text-paynes_gray-500 dark:text-french_gray-400">
              {days < 0 ? "Overdue" : `${days} days left`}
            </span>
          )}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1 rounded-lg hover:bg-lavender-50 dark:hover:bg-paynes_gray-400"
            >
              <MoreVertical size={16} className="text-paynes_gray-500 dark:text-french_gray-400" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-outer_space-500 border border-lavender-100 dark:border-paynes_gray-400 rounded-xl shadow-lg z-10 overflow-hidden">
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    setEditOpen(true)
                  }}
                  className="w-full flex items-center px-3 py-2 text-sm text-outer_space-500 dark:text-platinum-500 hover:bg-lavender-50 dark:hover:bg-paynes_gray-400"
                >
                  <Pencil size={14} className="mr-2" /> Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="w-full flex items-center px-3 py-2 text-sm text-rose-500 hover:bg-lavender-50 dark:hover:bg-paynes_gray-400"
                >
                  <Trash2 size={14} className="mr-2" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Link href={`/projects/${project.id}`}>
        <h3 className="text-lg font-semibold text-outer_space-500 dark:text-platinum-500 mb-2 hover:text-lavender-600">
          {project.name}
        </h3>
      </Link>

      <p className="text-sm text-paynes_gray-500 dark:text-french_gray-400 mb-4 line-clamp-2">
        {project.description || "No description yet."}
      </p>

      <div className="flex items-center justify-between text-sm text-paynes_gray-500 dark:text-french_gray-400 mb-4">
        <span className="flex items-center gap-1">
          <Users size={14} /> {project.memberCount} members
        </span>
        <span className="flex items-center gap-1">
          <ListTodo size={14} /> {project.taskCount} tasks
        </span>
      </div>

      <div className="w-full bg-lavender-100 dark:bg-paynes_gray-400 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-lavender-400 to-mint-400 h-2 rounded-full transition-all"
          style={{ width: `${project.progress}%` }}
        />
      </div>

      <EditProjectModal project={project} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  )
}