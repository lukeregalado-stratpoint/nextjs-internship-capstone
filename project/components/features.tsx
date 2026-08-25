import type { LucideIcon } from "lucide-react"
import { Kanban, Users, Calendar, BarChart3, Shield, Zap } from "lucide-react"

const features: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Kanban,
    title: "Boards that match how work actually moves",
    description: "Drag a card from backlog to done and that's the status update. Nobody has to write one up.",
  },
  {
    icon: Users,
    title: "Everyone's stuff lives in one place",
    description: "Comments, assignments, whatever, it all shows up where the work already is.",
  },
  {
    icon: Calendar,
    title: "Deadlines without a separate spreadsheet",
    description: "Calendar view plus reminders means milestones don't quietly slip past you.",
  },
  {
    icon: BarChart3,
    title: "Find out where things are actually stuck",
    description: "Analytics break things down by project and by person, not just a burndown chart nobody reads.",
  },
  {
    icon: Shield,
    title: "Only your team sees your stuff",
    description: "Invite people, set roles, keep project data locked down to who's actually on it.",
  },
  {
    icon: Zap,
    title: "Updates land instantly",
    description: "Everything syncs live, so the board you're staring at is never out of date.",
  },
]

export function Features() {
  return (
    <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-16 max-w-xl">
          <p className="font-mono text-xs uppercase tracking-wider text-primary">./ FEATURES</p>
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