import Link from "next/link"
import { Plus } from "lucide-react"

export function CreateTaskButton({ projectId }: { projectId: string }) {
  return (
    <Link
      href={`/projects/${projectId}/tasks/new`}
      className="inline-flex items-center gap-1 shrink-0 rounded-md border border-french_gray-300 dark:border-paynes_gray-400 px-3 py-1.5 text-sm font-medium text-outer_space-500 dark:text-platinum-500 hover:bg-french_gray-100 dark:hover:bg-paynes_gray-500/20 transition-colors"
    >
      <Plus className="h-4 w-4" />
      New Task
    </Link>
  )
}