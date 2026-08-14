import { requireUser } from "@/lib/auth"
import { getProjectsForUser } from "@/lib/db/queries"
import { CreateProjectButton } from "@/components/create-project-button"
import { ProjectsExplorer } from "@/components/projects-explorer"

export default async function ProjectsPage() {
  const user = await requireUser()
  const projects = await getProjectsForUser(user.id)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground mt-2">
            Manage and organize your team projects
          </p>
        </div>
        <CreateProjectButton />
      </div>

      <ProjectsExplorer initialProjects={projects} />
    </div>
  )
}