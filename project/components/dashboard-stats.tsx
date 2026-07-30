import { FolderKanban, CheckCircle2, Clock, ListTodo } from "lucide-react"

interface DashboardStatsProps {
  activeProjects: number
  completedTasks: number
  inProgressTasks: number
  backlogTasks: number
}

const STAT_CONFIG = [
  { key: "activeProjects", label: "Active Projects", icon: FolderKanban, iconClass: "text-lavender-600 bg-lavender-100" },
  { key: "completedTasks", label: "Completed Tasks", icon: CheckCircle2, iconClass: "text-mint-600 bg-mint-100" },
  { key: "inProgressTasks", label: "In Progress", icon: Clock, iconClass: "text-amber-600 bg-amber-100" },
  { key: "backlogTasks", label: "Backlog", icon: ListTodo, iconClass: "text-paynes_gray-500 bg-french_gray-100" },
] as const

export function DashboardStats(stats: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {STAT_CONFIG.map(({ key, label, icon: Icon, iconClass }) => (
        <div
          key={key}
          className="bg-white dark:bg-outer_space-500 rounded-2xl border border-lavender-100 dark:border-paynes_gray-400 p-6 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${iconClass}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-outer_space-500 dark:text-platinum-500">{stats[key]}</p>
            <p className="text-sm text-paynes_gray-500 dark:text-french_gray-500">{label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}