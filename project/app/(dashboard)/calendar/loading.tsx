import { Skeleton } from "@/components/ui/skeleton"

export default function CalendarLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>

      <div>
        {/* Toolbar: Today/prev/next + month label, view switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-8 w-14 rounded-xl" />
            <Skeleton className="h-8 w-8 rounded-xl" />
            <Skeleton className="h-8 w-8 rounded-xl" />
            <Skeleton className="h-6 w-32 ml-1" />
          </div>
          <Skeleton className="h-9 w-52 rounded-xl" />
        </div>

        {/* Month grid: 7-day header + 5 weeks */}
        <div className="rounded-2xl border border-border overflow-hidden">
          <div className="grid grid-cols-7 bg-muted">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="p-2">
                <Skeleton className="h-4 w-8 mx-auto" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={i}
                className="h-24 border-t border-l border-border p-1.5 space-y-1 first:border-l-0 [&:nth-child(7n+1)]:border-l-0"
              >
                <Skeleton className="h-3 w-4" />
                {i % 3 === 0 && <Skeleton className="h-3 w-full rounded" />}
                {i % 5 === 0 && <Skeleton className="h-3 w-3/4 rounded" />}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Skeleton className="h-2.5 w-2.5 rounded-full" />
              <Skeleton className="h-3.5 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}