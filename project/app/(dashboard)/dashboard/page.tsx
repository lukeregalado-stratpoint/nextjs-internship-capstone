import { requireUser } from "@/lib/auth"
import { getProjectsForOwner, getDashboardStatsForOwner } from "@/lib/db/queries"
import { DashboardStats } from "@/components/dashboard-stats"
import { RecentProjects } from "@/components/recent-projects"

export default async function DashboardPage() {
  const user = await requireUser()
  const [projects, stats] = await Promise.all([
    getProjectsForOwner(user.id),
    getDashboardStatsForOwner(user.id),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-outer_space-500 dark:text-platinum-500">Dashboard</h1>
        <p className="text-paynes_gray-500 dark:text-french_gray-500 mt-2">
          Welcome back, {user.name}! Here's an overview of your projects and tasks.
        </p>
      </div>

      <DashboardStats {...stats} />

      <RecentProjects projects={projects.slice(0, 3)} />
    </div>
  )
}