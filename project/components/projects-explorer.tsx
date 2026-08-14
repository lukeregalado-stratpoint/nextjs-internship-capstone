"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { ProjectGrid } from "@/components/project-grid"
import type { ProjectCardData } from "@/components/project-card"

export function ProjectsExplorer({ initialProjects }: { initialProjects: ProjectCardData[] }) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return initialProjects
    return initialProjects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
    )
  }, [initialProjects, query])

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground dark:text-paper/60"
          size={16}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects..."
          className="w-full sm:max-w-sm pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-foreground dark:text-paper placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <ProjectGrid projects={filtered} />
    </div>
  )
}
