import { Skeleton } from "@/components/ui/skeleton"

const COLUMN_COUNT = 4
const CARDS_PER_COLUMN = [3, 4, 2, 3]

export default function ProjectDetailLoading() {
  return (
    <div className="space-y-6">
      {/* ProjectHeader: title row + stats strip */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-6 flex items-start justify-between gap-4">
          <div className="space-y-2 min-w-0 flex-1">
            <Skeleton className="h-8 w-64 max-w-full" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
        </div>

        <div className="border-t border-border bg-muted/60 px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-7 w-7 rounded-full ring-2 ring-card"
                />
              ))}
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>

      {/* TaskSearchBar */}
      <div className="px-3 sm:px-0">
        <Skeleton className="h-10 w-full sm:max-w-md rounded-xl" />
      </div>

      {/* Kanban columns (mirrors BoardColumn: 288px/72 wide, ~67dvh tall) */}
      <div className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto pb-4 px-3 -mx-3 sm:mx-0 sm:px-0">
        {Array.from({ length: COLUMN_COUNT }).map((_, colIndex) => (
          <div
            key={colIndex}
            className="w-[85vw] max-w-[288px] sm:w-72 shrink-0 flex flex-col h-[67dvh]
              bg-muted rounded-2xl border
              border-border/80 dark:border-transparent p-3 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-5 rounded" />
            </div>

            <div className="space-y-2 flex-1 overflow-hidden">
              {Array.from({ length: CARDS_PER_COLUMN[colIndex % CARDS_PER_COLUMN.length] }).map(
                (_, cardIndex) => (
                  <div
                    key={cardIndex}
                    className="bg-card rounded-xl p-3 space-y-2 shadow-sm"
                  >
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-3 w-2/3" />
                    <div className="flex items-center justify-between pt-1">
                      <Skeleton className="h-5 w-14 rounded-full" />
                      <Skeleton className="h-6 w-6 rounded-full" />
                    </div>
                  </div>
                )
              )}
            </div>

            <Skeleton className="h-8 w-full rounded-lg shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}