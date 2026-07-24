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
          <h1 className="text-3xl font-bold text-outer_space-500 dark:text-platinum-500">Projects</h1>
          <p className="text-paynes_gray-500 dark:text-french_gray-500 mt-2">
            Manage and organize your team projects
          </p>
        </div>
        <CreateProjectButton />
      </div>

      <ProjectsExplorer initialProjects={projects} />
    </div>
  )
}
