import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

/**
 * Base shimmer block. Compose these to build page-shaped skeletons instead
 * of using generic full-page spinners — this way loading.tsx fallbacks
 * roughly match the layout that replaces them, so there's no layout jump
 * once the real data (DashboardStats, ProjectGrid, KanbanBoard, etc.) mounts.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-french_gray-200 dark:bg-paynes_gray-400/60",
        className
      )}
      {...props}
    />
  )
}