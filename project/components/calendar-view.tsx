"use client"

import { useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { Calendar, dateFnsLocalizer, Views, type EventWrapperProps } from "react-big-calendar"
import format from "date-fns/format"
import parse from "date-fns/parse"
import startOfWeek from "date-fns/startOfWeek"
import startOfDay from "date-fns/startOfDay"
import addDays from "date-fns/addDays"
import addMonths from "date-fns/addMonths"
import isSameDay from "date-fns/isSameDay"
import isToday from "date-fns/isToday"
import isBefore from "date-fns/isBefore"
import getDay from "date-fns/getDay"
import enUS from "date-fns/locale/en-US"
import {
  ChevronLeft,
  ChevronRight,
  ChevronRight as ArrowRight,
  CheckSquare,
  FolderOpen,
  Flag,
  CalendarX,
} from "lucide-react"
import { cn } from "@/lib/utils"

import "react-big-calendar/lib/css/react-big-calendar.css"
import "./calendar-view.css"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TaskForCalendar = {
  id: string
  title: string
  dueDate: Date | string
  priority: "low" | "medium" | "high"
  list: {
    id: string
    name: string
    project: { id: string; name: string }
  }
}

export type ProjectForCalendar = {
  id: string
  name: string
  dueDate: Date | string
}

type CalendarViewProps = {
  tasks: TaskForCalendar[]
  projects: ProjectForCalendar[]
}

// Tasks only ever carry a due *date* (see schema/task-card — no time field
// is collected or shown anywhere), so items are modeled as a single `date`,
// not a start/end range. `start`/`end`/`allDay` are still produced for the
// react-big-calendar month grid below, which wants that shape.
type CalendarItem = {
  id: string
  title: string
  date: Date
  type: "task" | "project"
  priority?: "low" | "medium" | "high"
  projectId: string
  projectName?: string
  listName?: string
}

type HoveredItem = {
  item: CalendarItem
  x: number
  y: number
}

type ViewMode = "month" | "week" | "agenda"

const VIEW_OPTIONS: { key: ViewMode; label: string }[] = [
  { key: "month", label: "Month" },
  { key: "week", label: "Week" },
  { key: "agenda", label: "Agenda" },
]

// ---------------------------------------------------------------------------
// Localizer (date-fns) — only needed for the month grid now
// ---------------------------------------------------------------------------

const locales = { "en-US": enUS }

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 0 }),
  getDay,
  locales,
})

// ---------------------------------------------------------------------------
// Shared toolbar — drives month/week navigation and the view tabs. Agenda
// has no meaningful "page" to move through (it just lists everything in
// order), so Prev/Next are hidden there and Today scrolls to today's group
// instead of changing a date cursor.
// ---------------------------------------------------------------------------

function CalendarToolbar({
  view,
  onViewChange,
  cursorDate,
  onNavigate,
  onToday,
}: {
  view: ViewMode
  onViewChange: (v: ViewMode) => void
  cursorDate: Date
  onNavigate: (dir: "PREV" | "NEXT") => void
  onToday: () => void
}) {
  const label = useMemo(() => {
    if (view === "month") return format(cursorDate, "MMMM yyyy")
    if (view === "week") {
      const start = startOfWeek(cursorDate, { weekStartsOn: 0 })
      const end = addDays(start, 6)
      return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`
    }
    return "All upcoming"
  }, [view, cursorDate])

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onToday}
          className="px-3 py-1.5 text-sm font-medium rounded-xl text-outer_space-500 dark:text-platinum-500 hover:bg-lavender-100 dark:hover:bg-paynes_gray-400 transition-colors"
        >
          Today
        </button>
        {view !== "agenda" && (
          <>
            <button
              type="button"
              onClick={() => onNavigate("PREV")}
              aria-label="Previous"
              className="p-1.5 rounded-xl text-outer_space-500 dark:text-platinum-500 hover:bg-lavender-100 dark:hover:bg-paynes_gray-400 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => onNavigate("NEXT")}
              aria-label="Next"
              className="p-1.5 rounded-xl text-outer_space-500 dark:text-platinum-500 hover:bg-lavender-100 dark:hover:bg-paynes_gray-400 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
        <h2 className="ml-1 text-lg font-semibold text-outer_space-500 dark:text-platinum-500">
          {label}
        </h2>
      </div>

      <div className="flex items-center gap-1 rounded-xl bg-lavender-50 dark:bg-paynes_gray-500/40 p-1">
        {VIEW_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onViewChange(option.key)}
            className={cn(
              "px-3 py-1 text-sm font-medium rounded-lg transition-colors",
              view === option.key
                ? "bg-white dark:bg-outer_space-500 text-lavender-700 dark:text-lavender-300 shadow-sm"
                : "text-paynes_gray-500 dark:text-french_gray-500 hover:text-outer_space-500 dark:hover:text-platinum-500"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

function CalendarLegend() {
  const items: { label: string; className: string }[] = [
    { label: "Low priority", className: "bg-mint-500" },
    { label: "Medium priority", className: "bg-lavender-500" },
    { label: "High priority", className: "bg-destructive" },
    { label: "Project due date", className: "bg-blue_munsell-500" },
  ]

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-xs text-paynes_gray-500 dark:text-french_gray-500">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className={cn("h-2.5 w-2.5 rounded-full", item.className)} />
          {item.label}
        </div>
      ))}
      <span className="text-paynes_gray-400 dark:text-french_gray-600">· click an item to open its project</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Hover tooltip — read-only preview, positioned near the cursor. Shared
// across month/week/agenda so hover behavior is consistent everywhere.
// ---------------------------------------------------------------------------

const TOOLTIP_WIDTH = 260

function ItemTooltip({ hovered }: { hovered: HoveredItem }) {
  const { item } = hovered
  const isTask = item.type === "task"

  const left =
    typeof window !== "undefined"
      ? Math.min(hovered.x, window.innerWidth - TOOLTIP_WIDTH - 12)
      : hovered.x
  const flipUp =
    typeof window !== "undefined" ? hovered.y > window.innerHeight - 180 : false
  const top = hovered.y

  if (typeof document === "undefined") return null

  return createPortal(
    <div
      className="fixed z-50 pointer-events-none rounded-2xl border border-white/50 dark:border-white/10 bg-white/95 dark:bg-outer_space-500/95 backdrop-blur-xl shadow-lg p-3"
      style={{
        left,
        top,
        width: TOOLTIP_WIDTH,
        transform: flipUp ? "translateY(-100%)" : undefined,
      }}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white",
            isTask
              ? item.priority === "high"
                ? "bg-destructive"
                : item.priority === "low"
                  ? "bg-mint-500"
                  : "bg-lavender-500"
              : "bg-blue_munsell-500"
          )}
        >
          {isTask ? <CheckSquare size={15} /> : <FolderOpen size={15} />}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-outer_space-500 dark:text-platinum-500 truncate">
            {item.title}
          </p>
          <p className="text-xs text-paynes_gray-500 dark:text-french_gray-500">
            {isTask ? `Due ${format(item.date, "PP")}` : `Project due ${format(item.date, "PP")}`}
          </p>
          {isTask && item.projectName && (
            <p className="text-xs text-paynes_gray-500 dark:text-french_gray-500 mt-1 truncate">
              {item.projectName}
              {item.listName ? ` · ${item.listName}` : ""}
            </p>
          )}
          {isTask && item.priority && (
            <div className="flex items-center gap-1 mt-1.5 text-[11px] font-medium text-paynes_gray-500 dark:text-french_gray-500">
              <Flag size={11} />
              <span className="capitalize">{item.priority} priority</span>
            </div>
          )}
          <div className="flex items-center gap-1 mt-2 text-[11px] font-medium text-lavender-600 dark:text-lavender-400">
            View project <ArrowRight size={11} />
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ---------------------------------------------------------------------------
// Reusable item chip — used by both the Week columns and the Agenda list
// ---------------------------------------------------------------------------

function ItemChip({
  item,
  onClick,
  onHover,
  onHoverEnd,
}: {
  item: CalendarItem
  onClick: () => void
  onHover: (e: ReactMouseEvent) => void
  onHoverEnd: () => void
}) {
  const isTask = item.type === "task"
  const dotClassName = isTask
    ? item.priority === "high"
      ? "bg-destructive"
      : item.priority === "low"
        ? "bg-mint-500"
        : "bg-lavender-500"
    : "bg-blue_munsell-500"

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseMove={onHover}
      onMouseLeave={onHoverEnd}
      className="w-full flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs
       bg-white dark:bg-outer_space-500 border border-lavender-100 dark:border-paynes_gray-400
        hover:border-lavender-300 dark:hover:border-lavender-500/50 transition-colors"
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotClassName)} />
      <span className="truncate text-outer_space-500 dark:text-platinum-500">{item.title}</span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Week view — 7 day columns, each a plain stacked list of that day's items.
// No hour grid: there's no time-of-day data to place on one.
// ---------------------------------------------------------------------------

function WeekView({
  cursorDate,
  itemsByDay,
  onItemClick,
  onHover,
  onHoverEnd,
}: {
  cursorDate: Date
  itemsByDay: Map<string, CalendarItem[]>
  onItemClick: (item: CalendarItem) => void
  onHover: (item: CalendarItem, e: ReactMouseEvent) => void
  onHoverEnd: () => void
}) {
  const weekStart = startOfWeek(cursorDate, { weekStartsOn: 0 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-7 sm:overflow-visible">
      {days.map((day) => {
        const key = format(day, "yyyy-MM-dd")
        const dayItems = itemsByDay.get(key) ?? []
        const today = isToday(day)

        return (
          <div
            key={key}
            className={cn(
              "w-[70vw] max-w-[220px] sm:w-auto shrink-0 snap-start rounded-2xl border p-2.5 flex flex-col",
              today
                ? "border-lavender-400 bg-lavender-50/60 dark:bg-lavender-500/10"
                : "border-lavender-100 dark:border-paynes_gray-400 bg-white/50 dark:bg-outer_space-500/40"
            )}
          >
            <div className="flex items-baseline justify-between mb-2 px-0.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-paynes_gray-500 dark:text-french_gray-500">
                {format(day, "EEE")}
              </span>
              <span
                className={cn(
                  "text-sm font-semibold",
                  today
                    ? "text-lavender-600 dark:text-lavender-300"
                    : "text-outer_space-500 dark:text-platinum-500"
                )}
              >
                {format(day, "d")}
              </span>
            </div>

            <div className="flex-1 space-y-1.5 min-h-[60px] max-h-[420px] overflow-y-auto scrollbar-thin">
              {dayItems.length === 0 ? (
                <p className="text-[11px] text-paynes_gray-400 dark:text-french_gray-600 px-0.5">
                  Nothing due
                </p>
              ) : (
                dayItems.map((item) => (
                  <ItemChip
                    key={item.id}
                    item={item}
                    onClick={() => onItemClick(item)}
                    onHover={(e) => onHover(item, e)}
                    onHoverEnd={onHoverEnd}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Agenda view — flat chronological list grouped by date. Past-due groups
// are flagged rather than hidden, since nothing here tracks completion.
// ---------------------------------------------------------------------------

function AgendaView({
  groupedItems,
  todayRef,
  onItemClick,
  onHover,
  onHoverEnd,
}: {
  groupedItems: { dateKey: string; date: Date; items: CalendarItem[] }[]
  todayRef: React.RefObject<HTMLDivElement>
  onItemClick: (item: CalendarItem) => void
  onHover: (item: CalendarItem, e: ReactMouseEvent) => void
  onHoverEnd: () => void
}) {
  return (
    <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1 scrollbar-thin">
      {groupedItems.map(({ dateKey, date, items }) => {
        const overdue = isBefore(date, startOfDay(new Date())) && !isToday(date)
        const today = isToday(date)
        const tomorrow = isSameDay(date, addDays(new Date(), 1))
        const label = today
          ? "Today"
          : tomorrow
            ? "Tomorrow"
            : format(date, "EEEE, MMM d, yyyy")

        return (
          <div key={dateKey} ref={today ? todayRef : undefined}>
            <div className="flex items-center gap-2 mb-1.5">
              <h3
                className={cn(
                  "text-sm font-semibold",
                  overdue
                    ? "text-destructive"
                    : today
                      ? "text-lavender-600 dark:text-lavender-300"
                      : "text-outer_space-500 dark:text-platinum-500"
                )}
              >
                {label}
              </h3>
              {overdue && (
                <span className="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">
                  Overdue
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {items.map((item) => {
                const isTask = item.type === "task"
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onItemClick(item)}
                    onMouseEnter={(e) => onHover(item, e)}
                    onMouseMove={(e) => onHover(item, e)}
                    onMouseLeave={onHoverEnd}
                    className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left
                     bg-white dark:bg-outer_space-500 border border-lavender-100 dark:border-paynes_gray-400
                      hover:border-lavender-300 dark:hover:border-lavender-500/50 transition-colors"
                  >
                    <div
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white",
                        isTask
                          ? item.priority === "high"
                            ? "bg-destructive"
                            : item.priority === "low"
                              ? "bg-mint-500"
                              : "bg-lavender-500"
                          : "bg-blue_munsell-500"
                      )}
                    >
                      {isTask ? <CheckSquare size={12} /> : <FolderOpen size={12} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-outer_space-500 dark:text-platinum-500 truncate">
                        {item.title}
                      </p>
                      {isTask && item.projectName && (
                        <p className="text-[11px] text-paynes_gray-500 dark:text-french_gray-500 truncate">
                          {item.projectName}
                          {item.listName ? ` · ${item.listName}` : ""}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-12 w-12 rounded-2xl bg-lavender-100 dark:bg-paynes_gray-500/40 flex items-center justify-center mb-4">
        <CalendarX className="text-lavender-500" size={22} />
      </div>
      <p className="font-medium text-outer_space-500 dark:text-platinum-500">Nothing on the calendar yet</p>
      <p className="text-sm text-paynes_gray-500 dark:text-french_gray-500 mt-1 max-w-xs">
        Tasks assigned to you and projects with due dates will show up here.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CalendarView({ tasks, projects }: CalendarViewProps) {
  const router = useRouter()
  const [view, setView] = useState<ViewMode>("month")
  const [cursorDate, setCursorDate] = useState(new Date())
  const [hovered, setHovered] = useState<HoveredItem | null>(null)
  const todayGroupRef = useRef<HTMLDivElement>(null)

  const eventWrapperRef = useRef(function EventWrapper({
    event,
    children,
  }: EventWrapperProps<CalendarItem & { start: Date; end: Date; allDay: boolean }> & {
    children?: React.ReactNode
  }) {
    return (
      <div
        onMouseEnter={(e) => setHovered({ item: event, x: e.clientX, y: e.clientY })}
        onMouseMove={(e) => setHovered({ item: event, x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setHovered(null)}
      >
        {children}
      </div>
    )
  })

  const items = useMemo<CalendarItem[]>(() => {
    const taskItems: CalendarItem[] = tasks
      .filter((task) => !!task.dueDate)
      .map((task) => ({
        id: `task-${task.id}`,
        title: task.title,
        date: startOfDay(new Date(task.dueDate)),
        type: "task",
        priority: task.priority,
        projectId: task.list.project.id,
        projectName: task.list.project.name,
        listName: task.list.name,
      }))

    const projectItems: CalendarItem[] = projects
      .filter((project) => !!project.dueDate)
      .map((project) => ({
        id: `project-${project.id}`,
        title: project.name,
        date: startOfDay(new Date(project.dueDate)),
        type: "project",
        projectId: project.id,
      }))

    return [...taskItems, ...projectItems].sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [tasks, projects])

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>()
    for (const item of items) {
      const key = format(item.date, "yyyy-MM-dd")
      const existing = map.get(key)
      if (existing) existing.push(item)
      else map.set(key, [item])
    }
    return map
  }, [items])

  const groupedItems = useMemo(
    () =>
      Array.from(itemsByDay.entries()).map(([dateKey, groupItems]) => ({
        dateKey,
        date: groupItems[0].date,
        items: groupItems,
      })),
    [itemsByDay]
  )

  // react-big-calendar's month grid still wants start/end/allDay events
  const monthEvents = useMemo(
    () => items.map((item) => ({ ...item, start: item.date, end: item.date, allDay: true })),
    [items]
  )

  const eventPropGetter = (event: CalendarItem) => ({
    className: event.type === "project" ? "event-project" : `event-task-${event.priority ?? "medium"}`,
  })

  function handleItemClick(item: CalendarItem) {
    setHovered(null)
    router.push(`/projects/${item.projectId}`)
  }

  function handleNavigate(dir: "PREV" | "NEXT") {
    const delta = dir === "PREV" ? -1 : 1
    setCursorDate((prev) => (view === "month" ? addMonths(prev, delta) : addDays(prev, delta * 7)))
  }

  function handleToday() {
    const now = new Date()
    setCursorDate(now)
    if (view === "agenda") {
      todayGroupRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-white/50 dark:border-white/10 bg-white/70 dark:bg-outer_space-500/60 backdrop-blur-xl backdrop-saturate-150 shadow-[4px_4px_0_0_rgba(139,124,246,0.14)] dark:shadow-[4px_4px_0_0_rgba(0,0,0,0.35)] p-4 sm:p-6">
        <EmptyState />
      </div>
    )
  }

  return (
    <div className="rounded-3xl border-2 border-white/50 dark:border-white/10 bg-white/70 dark:bg-outer_space-500/60 backdrop-blur-xl backdrop-saturate-150 shadow-[4px_4px_0_0_rgba(139,124,246,0.14)] dark:shadow-[4px_4px_0_0_rgba(0,0,0,0.35)] p-4 sm:p-6">
      <CalendarToolbar
        view={view}
        onViewChange={setView}
        cursorDate={cursorDate}
        onNavigate={handleNavigate}
        onToday={handleToday}
      />
      <CalendarLegend />

      {view === "month" && (
        <div className="custom-calendar" style={{ height: 700 }}>
          <Calendar
            localizer={localizer}
            events={monthEvents}
            view={Views.MONTH}
            date={cursorDate}
            onNavigate={setCursorDate}
            startAccessor="start"
            endAccessor="end"
            popup
            selectable={false}
            toolbar={false}
            eventPropGetter={eventPropGetter}
            onSelectEvent={handleItemClick}
            components={{ eventWrapper: eventWrapperRef.current }}
            views={[Views.MONTH]}
          />
        </div>
      )}

      {view === "week" && (
        <WeekView
          cursorDate={cursorDate}
          itemsByDay={itemsByDay}
          onItemClick={handleItemClick}
          onHover={(item, e) => setHovered({ item, x: e.clientX, y: e.clientY })}
          onHoverEnd={() => setHovered(null)}
        />
      )}

      {view === "agenda" && (
        <AgendaView
          groupedItems={groupedItems}
          todayRef={todayGroupRef}
          onItemClick={handleItemClick}
          onHover={(item, e) => setHovered({ item, x: e.clientX, y: e.clientY })}
          onHoverEnd={() => setHovered(null)}
        />
      )}

      {hovered && <ItemTooltip hovered={hovered} />}
    </div>
  )
}