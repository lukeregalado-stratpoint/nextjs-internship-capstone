import { FolderKanban } from "lucide-react"
import { ProjectCard, type ProjectCardData } from "@/components/project-card"

export function ProjectGrid({ projects }: { projects: ProjectCardData[] }) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border rounded-lg">
        <FolderKanban size={40} className="text-muted-foreground dark:text-paper/60 mb-3" />
        <h3 className="text-lg font-semibold text-foreground dark:text-paper">
          No projects yet
        </h3>
        <p className="text-sm text-muted-foreground dark:text-paper/60 mt-1">
          Create your first project to get started.
        </p>
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
