import { BarChart3, CheckCircle2, TrendingUp, Users } from "lucide-react"
import { requireUser } from "@/lib/auth"
import {
  getActivityTimelineForOwner,
  getAnalyticsOverviewForOwner,
  getPriorityBreakdownForOwner,
  getProjectProgressForOwner,
} from "@/lib/db/queries"
import { ActivityTimelineChart, PriorityBreakdownChart, ProjectProgressChart } from "@/components/analytics-charts"

export default async function AnalyticsPage() {
  const user = await requireUser()

  const [overview, projectProgress, priorityBreakdown, activityTimeline] = await Promise.all([
    getAnalyticsOverviewForOwner(user.id),
    getProjectProgressForOwner(user.id),
    getPriorityBreakdownForOwner(user.id),
    getActivityTimelineForOwner(user.id, 14),
  ])

  // tailwind can't see class names built from a template string at
  // runtime (e.g. `bg-${color}-100`), so each entry spells its classes out
  // in full instead of interpolating a color name.
  const metrics = [
    {
      title: "Active Projects",
      value: overview.activeProjects,
      unit: "projects",
      icon: BarChart3,
      iconClass: "text-primary bg-primary/10",
    },
    {
      title: "Completion Rate",
      value: `${overview.completionRate}%`,
      unit: `${overview.completedTasks} of ${overview.totalTasks} tasks`,
      icon: CheckCircle2,
      iconClass: "text-done-text bg-done-wash dark:text-done-text-dark dark:bg-done-wash-dark",
    },
    {
      title: "In Progress",
      value: overview.inProgressTasks,
      unit: "tasks",
      icon: TrendingUp,
      iconClass: "text-review-text bg-review-wash dark:text-review-text-dark dark:bg-review-wash-dark",
    },
    {
      title: "Team Members",
      value: overview.teamMembersCount,
      unit: "across your projects",
      icon: Users,
      iconClass: "text-ink dark:text-paper bg-paper dark:bg-paper-dark",
    },
  ] as const

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-ink dark:text-paper">Analytics</h1>
        <p className="text-slate dark:text-slate-dark mt-2">
          Track project performance and team productivity
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {metrics.map((metric) => (
          <div
            key={metric.title}
            className="bg-surface dark:bg-surface-dark rounded-md border border-line dark:border-line-dark p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`h-10 w-10 rounded-md flex items-center justify-center ${metric.iconClass}`}>
                <metric.icon size={20} />
              </div>
            </div>
            <div className="text-2xl font-bold text-ink dark:text-paper mb-1">{metric.value}</div>
            <div className="text-sm text-slate dark:text-slate-dark mb-2">{metric.unit}</div>
            <div className="text-xs font-medium text-ink dark:text-paper">{metric.title}</div>
          </div>
        ))}

        <div className="bg-surface dark:bg-surface-dark rounded-md border border-line dark:border-line-dark p-6">
          <h3 className="text-sm font-medium text-ink dark:text-paper mb-3">Tasks by Priority</h3>
          <PriorityBreakdownChart data={priorityBreakdown} compact />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface dark:bg-surface-dark rounded-md border border-line dark:border-line-dark p-6">
          <h3 className="text-lg font-semibold text-ink dark:text-paper mb-4">Project Progress</h3>
          <ProjectProgressChart data={projectProgress} />
        </div>

        <div className="bg-surface dark:bg-surface-dark rounded-md border border-line dark:border-line-dark p-6">
          <h3 className="text-lg font-semibold text-ink dark:text-paper mb-4">
            Activity, last 14 days
          </h3>
          <ActivityTimelineChart data={activityTimeline} />
        </div>
      </div>
    </div>
  )
}