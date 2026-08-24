import type { LucideIcon } from "lucide-react"
import { Kanban, Users, Calendar, BarChart3, Shield, Zap } from "lucide-react"

const features: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Kanban,
    title: "Boards that match how work moves",
    description: "Drag a card from backlog to done. The board is the status update, nobody has to write one.",
  },
  {
    icon: Users,
    title: "One place for the whole team",
    description: "Comments, assignments, and updates land where the work already lives.",
  },
  {
    icon: Calendar,
    title: "Deadlines you don't have to track by hand",
    description: "Calendar views and due-date reminders keep milestones visible without a spreadsheet.",
  },
  {
    icon: BarChart3,
    title: "See where things are actually stuck",
    description: "Analytics surface bottlenecks by project and by person, not just a burndown chart.",
  },
  {
    icon: Shield,
    title: "Access scoped to your team",
    description: "Invite members, manage roles, and keep project data visible only to the people on it.",
  },
  {
    icon: Zap,
    title: "Updates as they happen",
    description: "Changes sync in real time, so the board you're looking at is never stale.",
  },
]

export function Features() {
  return (
    <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-16 max-w-xl">
          <p className="font-mono text-xs uppercase tracking-wider text-primary">What's included</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink dark:text-paper md:text-4xl">
            Built around the board, not around meetings
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line dark:border-line-dark dark:bg-line-dark md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div key={feature.title} className="bg-paper p-6 transition-colors hover:bg-surface dark:bg-paper-dark dark:hover:bg-surface-dark">
              <div className="mb-4 flex items-center justify-between">
                <feature.icon className="text-primary" size={22} />
                <span className="font-mono text-xs text-slate dark:text-slate-dark">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mb-2 font-semibold text-ink dark:text-paper">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-slate dark:text-slate-dark">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}