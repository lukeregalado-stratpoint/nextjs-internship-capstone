import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"

// fake data, board isn't wired up here
function BoardPreview() {
  return (
    <div className="relative">
      <div className="grid grid-cols-3 gap-3 rounded-xl border border-line bg-surface p-4 dark:border-line-dark dark:bg-surface-dark">
        {/* backlog */}
        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate dark:text-slate-dark">
            Backlog · 2
          </p>
          <div className="rounded-md border border-line bg-paper p-2.5 text-xs text-ink/70 dark:border-line-dark dark:bg-paper-dark dark:text-paper/70">
            Design onboarding flow
          </div>
          <div className="rounded-md border border-line bg-paper p-2.5 text-xs text-ink/70 dark:border-line-dark dark:bg-paper-dark dark:text-paper/70">
            Write API docs
          </div>
        </div>

        {/* in review */}
        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate dark:text-slate-dark">
            In review · 1
          </p>
          <div className="-rotate-2 rounded-md border border-review bg-review-wash p-2.5 text-xs font-medium text-review-text shadow-md dark:bg-review-wash-dark dark:text-review-text-dark">
            Refactor auth middleware
          </div>
        </div>

        {/* done */}
        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate dark:text-slate-dark">
            Done · 1
          </p>
          <div className="flex items-start gap-1.5 rounded-md border border-done bg-done-wash p-2.5 text-xs font-medium text-done-text dark:bg-done-wash-dark dark:text-done-text-dark">
            <Check size={13} className="mt-0.5 shrink-0" />
            Set up CI pipeline
          </div>
        </div>
      </div>
    </div>
  )
}

export function Hero() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="container mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <h1 className="text-5xl font-bold tracking-tight text-ink dark:text-paper md:text-6xl">
            Work in progress,
            <br />
            <span className="text-primary">always in your radar.</span>
          </h1>

          <p className="mt-6 max-w-lg text-lg text-slate dark:text-slate-dark">
            One board your whole team can see: backlog, in review, done. Nobody has to sit
            through a status meeting to find out what happened to a task.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Open the board
              <ArrowRight className="ml-2" size={16} />
            </Link>
            <Link
              href="/projects"
              className="inline-flex items-center justify-center rounded-md border border-line px-6 py-3 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary dark:border-line-dark dark:text-paper"
            >
              Browse example projects
            </Link>
          </div>
        </div>

        <BoardPreview />
      </div>
    </section>
  )
}