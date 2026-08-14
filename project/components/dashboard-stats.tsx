import { FolderKanban, CheckCircle2, Clock, ListTodo } from "lucide-react"

interface DashboardStatsProps {
  activeProjects: number
  completedTasks: number
  inProgressTasks: number
  backlogTasks: number
}

const STAT_CONFIG = [
  { key: "activeProjects", label: "Active projects", icon: FolderKanban, accent: null },
  { key: "completedTasks", label: "Completed tasks", icon: CheckCircle2, accent: "done" },
  { key: "inProgressTasks", label: "In progress", icon: Clock, accent: "signal" },
  { key: "backlogTasks", label: "Backlog", icon: ListTodo, accent: null },
] as const

// static lookups, not interpolated strings, so tailwind's compiler actually sees these classes
const ACCENT_WASH: Record<string, string> = {
  done: "bg-done-wash dark:bg-done-wash-dark",
  signal: "bg-signal-wash dark:bg-signal-wash-dark",
}

const ACCENT_TEXT: Record<string, string> = {
  done: "text-done-text dark:text-done-text-dark",
  signal: "text-signal-text dark:text-signal-text-dark",
}

const ACCENT_ICON: Record<string, string> = {
  done: "text-done",
  signal: "text-signal",
}

export function DashboardStats(stats: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {STAT_CONFIG.map(({ key, label, icon: Icon, accent }) => (
        <div
          key={key}
          className={`rounded-md border border-line dark:border-line-dark px-4 py-3.5 ${
            accent ? ACCENT_WASH[accent] : "bg-surface dark:bg-surface-dark"
          }`}
        >
          <div className={`flex items-center gap-1.5 ${accent ? ACCENT_TEXT[accent] : "text-slate dark:text-slate-dark"}`}>
            <Icon className={`h-3.5 w-3.5 ${accent ? ACCENT_ICON[accent] : ""}`} strokeWidth={2} />
            <p className="text-xs font-medium">{label}</p>
          </div>
          <p className={`text-2xl font-medium tabular-nums mt-1.5 ${accent ? ACCENT_TEXT[accent] : "text-ink dark:text-paper"}`}>
            {stats[key]}
          </p>
        </div>
      ))}
    </div>
  )
}