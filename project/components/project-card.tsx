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
  isOwner: boolean
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
    <div className="relative bg-card rounded-2xl border border-border p-6 hover:shadow-md hover:border-primary transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="w-3 h-3 bg-primary rounded-full mt-1" />

        <div className="flex items-center gap-2">
          {days !== null && (
            <span className="text-sm text-muted-foreground dark:text-paper/60">
              {days < 0 ? "Overdue" : `${days} days left`}
            </span>
          )}
          {project.isOwner && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="p-1 rounded-lg hover:bg-muted"
              >
                <MoreVertical size={16} className="text-muted-foreground dark:text-paper/60" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 w-36 bg-card border border-border rounded-xl shadow-lg z-10 overflow-hidden">
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      setEditOpen(true)
                    }}
                    className="w-full flex items-center px-3 py-2 text-sm text-foreground dark:text-paper hover:bg-muted"
                  >
                    <Pencil size={14} className="mr-2" /> Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isPending}
                    className="w-full flex items-center px-3 py-2 text-sm text-rose-500 hover:bg-muted"
                  >
                    <Trash2 size={14} className="mr-2" /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Link href={`/projects/${project.id}`}>
        <h3 className="text-lg font-semibold text-foreground dark:text-paper mb-2 hover:text-primary">
          {project.name}
        </h3>
      </Link>

      <p className="text-sm text-muted-foreground dark:text-paper/60 mb-4 line-clamp-2">
        {project.description || "No description yet."}
      </p>

      <div className="flex items-center justify-between text-sm text-muted-foreground dark:text-paper/60 mb-4">
        <span className="flex items-center gap-1">
          <Users size={14} /> {project.memberCount} members
        </span>
        <span className="flex items-center gap-1">
          <ListTodo size={14} /> {project.taskCount} tasks
        </span>
      </div>

      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all"
          style={{ width: `${project.progress}%` }}
        />
      </div>

      <EditProjectModal project={project} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  )
}