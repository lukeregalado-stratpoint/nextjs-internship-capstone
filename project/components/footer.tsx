import Link from "next/link"

const columns = [
  {
    heading: "Product",
    links: ["Features", "Pricing", "Security"],
  },
  {
    heading: "Company",
    links: ["About", "Blog", "Careers"],
  },
  {
    heading: "Support",
    links: ["Help center", "Contact", "API docs"],
  },
]

export function Footer() {
  return (
    <footer className="bg-ink py-16 text-paper dark:bg-paper-dark">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div>
            <p className="text-lg font-semibold">WIP</p>
            <p className="mt-3 max-w-xs text-sm text-paper/60">
              A kanban board for teams who'd rather look at the work than talk about it.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.heading}>
              <p className="text-sm font-semibold">{column.heading}</p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link}>
                    <Link href="#" className="text-sm text-paper/60 transition-colors hover:text-paper">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-paper/10 pt-8 text-sm text-paper/50">
          © {new Date().getFullYear()} WIP.
        </div>
      </div>
    </footer>
  )
}