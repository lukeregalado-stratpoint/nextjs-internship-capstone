import Link from "next/link"
import { CreateProjectButton } from "@/components/create-project-button"
import { CreateTaskButton } from "@/components/create-task-button"

type ProjectRole = "product_owner" | "scrum_master" | "developer" | "stakeholder"

const ROLE_LABELS: Record<ProjectRole, string> = {
  product_owner: "Product Owner",
  scrum_master: "Scrum Master",
  developer: "Developer",
  stakeholder: "Stakeholder",
}

interface ProjectMember {
  userId: string
  role: ProjectRole
  user: {
    id: string
    name: string
  }
}

interface Project {
  id: string
  name: string
  description?: string | null
  members?: ProjectMember[]
}

interface RecentProjectsProps {
  projects: Project[]
}

export function RecentProjects({ projects }: RecentProjectsProps) {
  return (
    <div className="bg-white dark:bg-outer_space-500 rounded-2xl border border-lavender-100 dark:border-paynes_gray-400 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-outer_space-500 dark:text-platinum-500">Recent Projects</h3>
        <CreateProjectButton />
      </div>

      <div className="space-y-3">
        {projects.length === 0 && (
          <p className="text-sm text-paynes_gray-500 dark:text-french_gray-500">
            No projects yet. Create your first one to get started.
          </p>
        )}

        {projects.map((project) => {
          const members = project.members ?? []

          return (
            <div
              key={project.id}
              className="rounded-xl border border-lavender-100 dark:border-paynes_gray-400 p-4 flex items-center justify-between gap-4 hover:border-lavender-300 transition-colors"
            >
              <div className="min-w-0">
                <Link
                  href={`/projects/${project.id}`}
                  className="font-medium text-outer_space-500 dark:text-platinum-500 hover:underline truncate block"
                >
                  {project.name}
                </Link>
                {project.description && (
                  <p className="text-sm text-paynes_gray-500 dark:text-french_gray-500 truncate">
                    {project.description}
                  </p>
                )}

                {members.length > 0 && (
                  <div className="flex items-center -space-x-2 mt-2">
                    {members.slice(0, 4).map((member) => (
                      <div
                        key={member.userId}
                        title={`${member.user.name} — ${ROLE_LABELS[member.role]}`}
                        className="h-7 w-7 rounded-full ring-2 ring-white dark:ring-outer_space-500 bg-lavender-100 dark:bg-paynes_gray-400 flex items-center justify-center text-xs font-medium text-lavender-700 dark:text-platinum-500"
                      >
                        {member.user.name.charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {members.length > 4 && (
                      <div className="h-7 w-7 rounded-full ring-2 ring-white dark:ring-outer_space-500 bg-lavender-500 flex items-center justify-center text-xs font-medium text-white">
                        +{members.length - 4}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <CreateTaskButton projectId={project.id} />
            </div>
          )
        })}
      </div>
    </div>
  )
}