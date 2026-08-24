import { notFound } from "next/navigation"
import { requireUser } from "@/lib/auth"
import { getProjectById } from "@/lib/db/queries"
import { ProjectHeader } from "@/components/project-header"
import { KanbanBoard } from "@/components/kanban-board"

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireUser()
  const project = await getProjectById(id)

  if (!project) {
    notFound()
  }

  const isOwner = project.ownerId === user.id
  const isMember = project.members.some((m) => m.user.id === user.id)

  // Members (any role) can view and work in a project they've been added
  // to, not just the owner — see Task 6.4 permissions.
  if (!isOwner && !isMember) {
    notFound()
  }

  // The owner isn't a row in project_members, so their "role" for display
  // purposes is just "owner" rather than one of the projectRoleEnum values.
  const currentUserRole = isOwner
    ? "owner"
    : project.members.find((m) => m.user.id === user.id)?.role ?? null

  // Owner + members, for the assignee picker and task-card avatars.
  const members = [
    { id: project.owner.id, name: project.owner.name },
    ...project.members.map((m) => ({ id: m.user.id, name: m.user.name })),
  ]

  // Surfaced in the header's stats strip.
  const listCount = project.lists.length
  const taskCount = project.lists.reduce((sum, list) => sum + list.tasks.length, 0)

  return (
    <div className="space-y-6">
      <ProjectHeader
        project={project}
        isOwner={isOwner}
        currentUserRole={currentUserRole}
        owner={{ name: project.owner.name, email: project.owner.email }}
        members={project.members}
        listCount={listCount}
        taskCount={taskCount}
      />
      <KanbanBoard
        projectId={project.id}
        currentUserId={user.id}
        initialLists={project.lists}
        members={members}
        initialLabels={project.labels}
        isOwner={isOwner}
      />
    </div>
  )
}