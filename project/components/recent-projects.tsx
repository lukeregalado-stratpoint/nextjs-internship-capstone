import Link from "next/link"
import { CreateProjectButton } from "@/components/create-project-button"
import { CreateTaskButton } from "@/components/create-task-button"

type ProjectRole = "product_owner" | "scrum_master" | "developer" | "stakeholder"

const ROLE_LABELS: Record<ProjectRole, string> = {
  product_owner: "Product owner",
  scrum_master: "Scrum master",
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
    <div className="bg-surface dark:bg-surface-dark rounded-md border border-line dark:border-line-dark">
      <div className="flex items-center justify-between px-5 py-4 border-b border-line dark:border-line-dark">
        <h3 className="text-sm font-medium text-ink dark:text-paper">Recent projects</h3>
        <CreateProjectButton />
      </div>

      <div className="divide-y divide-line dark:divide-line-dark">
        {projects.length === 0 && (
          <p className="text-sm text-slate dark:text-slate-dark px-5 py-6">
            No projects yet. Create your first one to get started.
          </p>
        )}

        {projects.map((project) => {
          const members = project.members ?? []

          return (
            <div
              key={project.id}
              className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-paper dark:hover:bg-paper-dark/60 transition-colors"
            >
              <div className="min-w-0">
                <Link
                  href={`/projects/${project.id}`}
                  className="text-sm font-medium text-ink dark:text-paper hover:text-signal-text dark:hover:text-signal-text-dark truncate block transition-colors"
                >
                  {project.name}
                </Link>
                {project.description && (
                  <p className="text-xs text-slate dark:text-slate-dark truncate mt-0.5">
                    {project.description}
                  </p>
                )}

                {members.length > 0 && (
                  <div className="flex items-center -space-x-1.5 mt-2">
                    {members.slice(0, 4).map((member) => (
                      <div
                        key={member.userId}
                        title={`${member.user.name} - ${ROLE_LABELS[member.role]}`}
                        className="h-6 w-6 rounded-sm ring-2 ring-surface dark:ring-surface-dark bg-signal-wash dark:bg-signal-wash-dark flex items-center justify-center text-[10px] font-medium text-signal-text dark:text-signal-text-dark"
                      >
                        {member.user.name.charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {members.length > 4 && (
                      <div className="h-6 w-6 rounded-sm ring-2 ring-surface dark:ring-surface-dark bg-ink dark:bg-paper flex items-center justify-center text-[10px] font-medium text-paper dark:text-ink">
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