"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowLeft, Calendar, LayoutGrid, ListChecks, Pencil, Trash2 } from "lucide-react"
import { useProjects } from "@/hooks/use-projects"
import { EditProjectModal } from "@/components/modals/edit-project-modal"
import { ManageMembersModal } from "@/components/modals/manage-members-modal"
import type { ProjectMember } from "@/lib/db/schema"

interface ProjectHeaderData {
  id: string
  name: string
  description: string | null
  dueDate: Date | null
}

interface MemberRow {
  id: string
  role: ProjectMember["role"]
  user: { id: string; name: string; email: string }
}

interface ProjectHeaderProps {
  project: ProjectHeaderData
  isOwner: boolean
  /** the signed-in user's role on this project: "owner" or a project_members role. */
  currentUserRole: ProjectMember["role"] | "owner" | null
  owner: { name: string; email: string }
  members: MemberRow[]
  /** number of board columns - shown in the stats strip. */
  listCount: number
  /** total tasks across every column - shown in the stats strip. */
  taskCount: number
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ""
  return (first + last).toUpperCase()
}

// "product_owner" -> "product owner"
function formatRole(role: string) {
  const spaced = role.replace(/_/g, " ")
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export function ProjectHeader({
  project,
  isOwner,
  currentUserRole,
  owner,
  members,
  listCount,
  taskCount,
}: ProjectHeaderProps) {
  const router = useRouter()
  const { deleteProject, isPending } = useProjects()
  const [editOpen, setEditOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)

  function handleDelete() {
    if (confirm(`Delete "${project.name}"? This can't be undone.`)) {
      deleteProject(project.id, () => router.push("/projects"))
    }
  }

  const isOverdue = project.dueDate ? new Date(project.dueDate) < new Date() : false
  // owner isn't part of `members` (that's the junction table), so combine
  // them here for the avatar stack / headcount.
  const people = [{ name: owner.name }, ...members.map((m) => ({ name: m.user.name }))]
  const visiblePeople = people.slice(0, 4)
  const overflowCount = people.length - visiblePeople.length

  return (
    <div className="space-y-2">
      <Link
        href="/projects"
        className="inline-flex items-center text-sm text-muted-foreground dark:text-paper/60 hover:text-primary"
      >
        <ArrowLeft size={14} className="mr-1" /> Back to projects
      </Link>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {/* title row */}
        <div className="p-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="text-3xl font-bold text-foreground dark:text-paper">
                {project.name}
              </h1>
              {currentUserRole && (
                <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground dark:text-paper shrink-0">
                  {formatRole(currentUserRole)}
                </span>
              )}
            </div>
            {project.description && (
              <p className="text-muted-foreground mt-2 max-w-2xl">
                {project.description}
              </p>
            )}
          </div>

          {isOwner && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setEditOpen(true)}
                aria-label="Edit project"
                title="Edit project"
                className="p-2 border border-border text-foreground dark:text-paper rounded-lg hover:bg-muted transition-colors"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                aria-label="Delete project"
                title="Delete project"
                className="p-2 border border-red-300 text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>

        {/* stats strip - avatars, list/task counts, due date */}
        <div className="border-t border-border bg-muted/60 px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <button
            type="button"
            onClick={() => isOwner && setMembersOpen(true)}
            disabled={!isOwner}
            className={`group flex items-center gap-2 ${isOwner ? "cursor-pointer" : "cursor-default"}`}
          >
            <div className="flex -space-x-2">
              {visiblePeople.map((p, i) => (
                <span
                  key={i}
                  title={p.name}
                  className="h-7 w-7 rounded-full ring-2 ring-card bg-primary/15 text-[10px] font-semibold text-primary dark:text-primary flex items-center justify-center"
                >
                  {initials(p.name)}
                </span>
              ))}
              {overflowCount > 0 && (
                <span className="h-7 w-7 rounded-full ring-2 ring-card bg-muted text-[10px] font-semibold text-foreground dark:text-paper flex items-center justify-center">
                  +{overflowCount}
                </span>
              )}
            </div>
            <span
              className={`text-sm text-muted-foreground dark:text-paper/60 ${
                isOwner ? "group-hover:text-primary" : ""
              }`}
            >
              {people.length} member{people.length === 1 ? "" : "s"}
              {isOwner ? " · Manage" : ""}
            </span>
          </button>

          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground dark:text-paper/60">
            <LayoutGrid size={14} /> {listCount} list{listCount === 1 ? "" : "s"}
          </span>

          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground dark:text-paper/60">
            <ListChecks size={14} /> {taskCount} task{taskCount === 1 ? "" : "s"}
          </span>

          {project.dueDate && (
            <span
              className={`inline-flex items-center gap-1.5 text-sm ${
                isOverdue ? "text-rose-500" : "text-muted-foreground dark:text-paper/60"
              }`}
            >
              <Calendar size={14} />
              {isOverdue ? "Overdue " : "Due "}
              {new Date(project.dueDate).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      </div>

      {isOwner && (
        <>
          <EditProjectModal project={project} open={editOpen} onOpenChange={setEditOpen} />
          <ManageMembersModal
            projectId={project.id}
            owner={owner}
            members={members}
            open={membersOpen}
            onOpenChange={setMembersOpen}
          />
        </>
      )}
    </div>
  )
}