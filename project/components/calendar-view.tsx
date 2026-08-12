"use client"

import { useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import {
  Calendar,
  dateFnsLocalizer,
  Views,
  type View,
  type ToolbarProps,
  type EventWrapperProps,
} from "react-big-calendar"
import format from "date-fns/format"
import parse from "date-fns/parse"
import startOfWeek from "date-fns/startOfWeek"
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

type CalendarEvent = {
  id: string
  title: string
  start: Date
  end: Date
  allDay: boolean
  type: "task" | "project"
  priority?: "low" | "medium" | "high"
  projectId: string
  projectName?: string
  listName?: string
}

type HoveredEvent = {
  event: CalendarEvent
  x: number
  y: number
}

// ---------------------------------------------------------------------------
// Localizer (date-fns)
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
// Custom toolbar — matches the app's glass-pill nav styling instead of the
// default react-big-calendar toolbar
// ---------------------------------------------------------------------------

const VIEW_OPTIONS: { key: View; label: string }[] = [
  { key: Views.MONTH, label: "Month" },
  { key: Views.WEEK, label: "Week" },
  { key: Views.DAY, label: "Day" },
  { key: Views.AGENDA, label: "Agenda" },
]

function CalendarToolbar({ label, onNavigate, onView, view }: ToolbarProps<CalendarEvent, object>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onNavigate("TODAY")}
          className="px-3 py-1.5 text-sm font-medium rounded-xl text-outer_space-500 dark:text-platinum-500 hover:bg-lavender-100 dark:hover:bg-paynes_gray-400 transition-colors"
        >
          Today
        </button>
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
        <h2 className="ml-1 text-lg font-semibold text-outer_space-500 dark:text-platinum-500">
          {label}
        </h2>
      </div>

      <div className="flex items-center gap-1 rounded-xl bg-lavender-50 dark:bg-paynes_gray-500/40 p-1">
        {VIEW_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onView(option.key)}
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
      <span className="text-paynes_gray-400 dark:text-french_gray-600">· click an event to open its project</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Hover tooltip — read-only preview, positioned near the cursor. Rendered
// once at the CalendarView level (not per-event) and driven by state set
// from the eventWrapper below, so there's only ever one tooltip in the DOM.
// ---------------------------------------------------------------------------

const TOOLTIP_WIDTH = 260

function EventTooltip({ hovered }: { hovered: HoveredEvent }) {
  const { event } = hovered
  const isTask = event.type === "task"

  // Anchored exactly on the cursor, clamped so it doesn't run off the right
  // edge of the viewport; flips above the cursor if it would run off the
  // bottom.
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
              ? event.priority === "high"
                ? "bg-destructive"
                : event.priority === "low"
                  ? "bg-mint-500"
                  : "bg-lavender-500"
              : "bg-blue_munsell-500"
          )}
        >
          {isTask ? <CheckSquare size={15} /> : <FolderOpen size={15} />}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-outer_space-500 dark:text-platinum-500 truncate">
            {event.title}
          </p>
          <p className="text-xs text-paynes_gray-500 dark:text-french_gray-500">
            {isTask ? `Due ${format(event.start, "PP")}` : `Project due ${format(event.start, "PP")}`}
          </p>
          {isTask && event.projectName && (
            <p className="text-xs text-paynes_gray-500 dark:text-french_gray-500 mt-1 truncate">
              {event.projectName}
              {event.listName ? ` · ${event.listName}` : ""}
            </p>
          )}
          {isTask && event.priority && (
            <div className="flex items-center gap-1 mt-1.5 text-[11px] font-medium text-paynes_gray-500 dark:text-french_gray-500">
              <Flag size={11} />
              <span className="capitalize">{event.priority} priority</span>
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
// Event wrapper — attaches hover tracking to each rendered event without
// changing its click behavior (onSelectEvent, wired up on the Calendar
// itself, still handles navigation).
// ---------------------------------------------------------------------------

function makeEventWrapper(setHovered: (h: HoveredEvent | null) => void) {
  return function EventWrapper({
    event,
    children,
  }: EventWrapperProps<CalendarEvent> & { children?: React.ReactNode }) {
    return (
      <div
        onMouseEnter={(e) => setHovered({ event, x: e.clientX, y: e.clientY })}
        onMouseMove={(e) => setHovered({ event, x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setHovered(null)}
      >
        {children}
      </div>
    )
  }
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
  const [view, setView] = useState<View>(Views.MONTH)
  const [date, setDate] = useState(new Date())
  const [hovered, setHovered] = useState<HoveredEvent | null>(null)
  // eventWrapper is stable across renders (setHovered from useState never
  // changes identity), so it's built once via ref rather than on every render.
  const eventWrapperRef = useRef(makeEventWrapper(setHovered))

  const events = useMemo<CalendarEvent[]>(() => {
    const taskEvents: CalendarEvent[] = tasks
      .filter((task) => !!task.dueDate)
      .map((task) => {
        const start = new Date(task.dueDate)
        return {
          id: `task-${task.id}`,
          title: task.title,
          start,
          end: start,
          allDay: true,
          type: "task",
          priority: task.priority,
          projectId: task.list.project.id,
          projectName: task.list.project.name,
          listName: task.list.name,
        }
      })

    const projectEvents: CalendarEvent[] = projects
      .filter((project) => !!project.dueDate)
      .map((project) => {
        const start = new Date(project.dueDate)
        return {
          id: `project-${project.id}`,
          title: project.name,
          start,
          end: start,
          allDay: true,
          type: "project",
          projectId: project.id,
        }
      })

    return [...taskEvents, ...projectEvents]
  }, [tasks, projects])

  const eventPropGetter = (event: CalendarEvent) => ({
    className:
      event.type === "project" ? "event-project" : `event-task-${event.priority ?? "medium"}`,
  })

  function handleSelectEvent(event: CalendarEvent) {
    setHovered(null)
    router.push(`/projects/${event.projectId}`)
  }

  if (events.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-white/50 dark:border-white/10 bg-white/70 dark:bg-outer_space-500/60 backdrop-blur-xl backdrop-saturate-150 shadow-[4px_4px_0_0_rgba(139,124,246,0.14)] dark:shadow-[4px_4px_0_0_rgba(0,0,0,0.35)] p-4 sm:p-6">
        <EmptyState />
      </div>
    )
  }

  return (
    <div className="rounded-3xl border-2 border-white/50 dark:border-white/10 bg-white/70 dark:bg-outer_space-500/60 backdrop-blur-xl backdrop-saturate-150 shadow-[4px_4px_0_0_rgba(139,124,246,0.14)] dark:shadow-[4px_4px_0_0_rgba(0,0,0,0.35)] p-4 sm:p-6">
      <CalendarLegend />

      <div className="custom-calendar" style={{ height: 700 }}>
        <Calendar
          localizer={localizer}
          events={events}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          startAccessor="start"
          endAccessor="end"
          popup
          selectable={false}
          eventPropGetter={eventPropGetter}
          onSelectEvent={handleSelectEvent}
          components={{ toolbar: CalendarToolbar, eventWrapper: eventWrapperRef.current }}
          views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
        />
      </div>

      {hovered && <EventTooltip hovered={hovered} />}
    </div>
  )
}