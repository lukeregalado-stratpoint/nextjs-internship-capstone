import type { Project } from "@/lib/db/schema"
import { ProjectCard } from "@/components/project-card"

export function ProjectGrid({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-16 text-paynes_gray-500 dark:text-french_gray-400">
        No projects yet. Create your first one to get started.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  )
}