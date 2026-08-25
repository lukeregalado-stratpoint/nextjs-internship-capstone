export function Footer() {
  return (
    <footer className="bg-ink py-16 text-paper dark:bg-paper-dark">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-lg font-semibold">WIP</p>
        <p className="mt-3 max-w-xs text-sm text-paper/60">
          A kanban board for teams who'd rather look at the work than talk about it.
        </p>

        <div className="mt-12 border-t border-paper/10 pt-8 text-sm text-paper/50">
          © {new Date().getFullYear()} WIP.
        </div>
      </div>
    </footer>
  )
}