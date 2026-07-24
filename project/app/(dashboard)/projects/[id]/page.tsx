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

  if (!project || project.ownerId !== user.id) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <ProjectHeader project={project} />
      <KanbanBoard projectId={project.id} initialLists={project.lists} />
    </div>
  )
}
