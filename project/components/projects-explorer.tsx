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
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-paynes_gray-500 dark:text-french_gray-400"
          size={16}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects..."
          className="w-full sm:max-w-sm pl-10 pr-4 py-2 bg-white dark:bg-outer_space-500 border border-french_gray-300 dark:border-paynes_gray-400 rounded-lg text-outer_space-500 dark:text-platinum-500 placeholder-paynes_gray-500 dark:placeholder-french_gray-400 focus:outline-none focus:ring-2 focus:ring-blue_munsell-500"
        />
      </div>

      <ProjectGrid projects={filtered} />
    </div>
  )
}
