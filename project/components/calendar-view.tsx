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
  CalendarX,} from "lucide-react"
import { cn } from "@/lib/utils"

import "react-big-calendar/lib/css/react-big-calendar.css"
import "./calendar-view.css"

export type TaskForCalendar = {
  id: string
  title: string
  dueDate: Date | string
  priority: "low" | "medium" | "high"
  list: {
    id: string
    name: string
    project: { id: string; name: string }}}

export type ProjectForCalendar = {
  id: string
  name: string
  dueDate: Date | string}

type CalendarViewProps = {
  tasks: TaskForCalendar[]
  projects: ProjectForCalendar[]}

// tasks only have a due date, no due time, so this is one `date` field
// instead of a start/end range.
// start/end/allday only get added back on for react-big-calendar's month
// grid since that's the shape it needs.
type CalendarItem = {
  id: string
  title: string
  date: Date
  type: "task" | "project"
  priority?: "low" | "medium" | "high"
  projectId: string
  projectName?: string
  listName?: string}

type HoveredItem = {
  item: CalendarItem
  x: number
  y: number}

type ViewMode = "month" | "week" | "agenda"

const VIEW_OPTIONS: { key: ViewMode; label: string }[] = [
  { key: "month", label: "Month" },
  { key: "week", label: "Week" },
  { key: "agenda", label: "Agenda" },]

const locales = { "en-US": enUS }

// only used by the month grid now, week and agenda are custom built
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 0 }),
  getDay,
  locales,})

// agenda doesn't really have a "page" to move through, it's just everything
// in order.
// so prev/next are hidden there and today just scrolls instead of moving a
// date cursor.
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
  onToday: () => void}) {
  const label = useMemo(() => {
    if (view === "month") return format(cursorDate, "MMMM yyyy")

    if (view === "week") {
      const start = startOfWeek(cursorDate, { weekStartsOn: 0 })
      const end = addDays(start, 6)

      return `${format(start, "MMM d")} to ${format(end, "MMM d, yyyy")}`}

    return "All upcoming"}, [view, cursorDate])

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onToday}
          className="px-3 py-1.5 text-sm font-medium rounded-md text-ink dark:text-paper hover:bg-paper dark:hover:bg-paper-dark transition-colors">
          Today
        </button>

        {view !== "agenda" && (
          <>
            <button
              type="button"
              onClick={() => onNavigate("PREV")}
              aria-label="Previous"
              className="p-1.5 rounded-md text-ink dark:text-paper hover:bg-paper dark:hover:bg-paper-dark transition-colors">
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              onClick={() => onNavigate("NEXT")}
              aria-label="Next"
              className="p-1.5 rounded-md text-ink dark:text-paper hover:bg-paper dark:hover:bg-paper-dark transition-colors">
              <ChevronRight size={18} />
            </button>
          </>
        )}

        <h2 className="ml-1 text-lg font-semibold text-ink dark:text-paper">
          {label}
        </h2>
      </div>

      <div className="flex items-center gap-1 rounded-md bg-paper dark:bg-paper-dark p-1">
        {VIEW_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onViewChange(option.key)}
            className={cn(
              "px-3 py-1 text-sm font-medium rounded-md transition-colors",
              view === option.key
                ? "bg-surface dark:bg-surface-dark text-primary"
                : "text-slate dark:text-slate-dark hover:text-ink dark:hover:text-paper")}>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )}

function CalendarLegend() {
  const items: { label: string; className: string }[] = [
    { label: "Low priority", className: "bg-done" },
    { label: "Medium priority", className: "bg-primary" },
    { label: "High priority", className: "bg-blocked" },
    { label: "Project due date", className: "bg-primary" },]

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-xs text-slate dark:text-slate-dark">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className={cn("h-2.5 w-2.5 rounded-full", item.className)} />
          {item.label}
        </div>
      ))}

      <span className="text-slate dark:text-slate-dark">· click an item to open its project</span>
    </div>
  )}

const TOOLTIP_WIDTH = 260

// shared by month, week, and agenda so hover behaves the same everywhere
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
      className="fixed z-50 pointer-events-none rounded-md border border-line dark:border-line-dark bg-surface dark:bg-surface-dark p-3"
      style={{
        left,
        top,
        width: TOOLTIP_WIDTH,
        transform: flipUp ? "translateY(-100%)" : undefined,}}>
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white",
            isTask
              ? item.priority === "high"
                ? "bg-blocked"
                : item.priority === "low"
                  ? "bg-done"
                  : "bg-primary"
              : "bg-primary")}>
          {isTask ? <CheckSquare size={15} /> : <FolderOpen size={15} />}
        </div>

        <div className="min-w-0">
          <p className="font-semibold text-sm text-ink dark:text-paper truncate">
            {item.title}
          </p>

          <p className="text-xs text-slate dark:text-slate-dark">
            {isTask ? `Due ${format(item.date, "PP")}` : `Project due ${format(item.date, "PP")}`}
          </p>

          {isTask && item.projectName && (
            <p className="text-xs text-slate dark:text-slate-dark mt-1 truncate">
              {item.projectName}
              {item.listName ? ` · ${item.listName}` : ""}
            </p>
          )}

          {isTask && item.priority && (
            <div className="flex items-center gap-1 mt-1.5 text-[11px] font-medium text-slate dark:text-slate-dark">
              <Flag size={11} />
              <span className="capitalize">{item.priority} priority</span>
            </div>
          )}

          <div className="flex items-center gap-1 mt-2 text-[11px] font-medium text-primary">
            View project <ArrowRight size={11} />
          </div>
        </div>
      </div>
    </div>,
    document.body
  )}

// used by both the week columns and the agenda list
function ItemChip({
  item,
  onClick,
  onHover,
  onHoverEnd,
}: {
  item: CalendarItem
  onClick: () => void
  onHover: (e: ReactMouseEvent) => void
  onHoverEnd: () => void}) {
  const isTask = item.type === "task"

  const dotClassName = isTask
    ? item.priority === "high"
      ? "bg-blocked"
      : item.priority === "low"
        ? "bg-done"
        : "bg-primary"
    : "bg-primary"

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseMove={onHover}
      onMouseLeave={onHoverEnd}
      className="w-full flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs
       bg-surface dark:bg-surface-dark border border-line dark:border-line-dark
        hover:border-primary/50 transition-colors">
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotClassName)} />
      <span className="truncate text-ink dark:text-paper">{item.title}</span>
    </button>
  )}

// no hour grid here, there's no time-of-day data to put on one anyway.
// just a stacked list per day.
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
  onHoverEnd: () => void}) {
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
              "w-[70vw] max-w-[220px] sm:w-auto shrink-0 snap-start rounded-md border p-2.5 flex flex-col",
              today
                ? "border-primary bg-primary/5"
                : "border-line dark:border-line-dark bg-surface dark:bg-surface-dark")}>
            <div className="flex items-baseline justify-between mb-2 px-0.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate dark:text-slate-dark">
                {format(day, "EEE")}
              </span>

              <span
                className={cn(
                  "text-sm font-semibold",
                  today
                    ? "text-primary"
                    : "text-ink dark:text-paper")}>
                {format(day, "d")}
              </span>
            </div>

            <div className="flex-1 space-y-1.5 min-h-[60px] max-h-[420px] overflow-y-auto scrollbar-thin">
              {dayItems.length === 0 ? (
                <p className="text-[11px] text-slate dark:text-slate-dark px-0.5">
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
        )})}
    </div>
  )}

// flat list grouped by date, overdue groups get flagged instead of hidden
// since completion isn't tracked here
function AgendaView({
  groupedItems,
  todayRef,
  onItemClick,
  onHover,
  onHoverEnd,
}: {
  groupedItems: { dateKey: string; date: Date; items: CalendarItem[] }[]
  todayRef: React.RefObject<HTMLDivElement | null>
  onItemClick: (item: CalendarItem) => void
  onHover: (item: CalendarItem, e: ReactMouseEvent) => void
  onHoverEnd: () => void}) {
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
                    ? "text-blocked"
                    : today
                      ? "text-primary"
                      : "text-ink dark:text-paper")}>
                {label}
              </h3>

              {overdue && (
                <span className="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-blocked/10 text-blocked">
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
                    className="w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-left
                     bg-surface dark:bg-surface-dark border border-line dark:border-line-dark
                      hover:border-primary/50 transition-colors">
                    <div
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white",
                        isTask
                          ? item.priority === "high"
                            ? "bg-blocked"
                            : item.priority === "low"
                              ? "bg-done"
                              : "bg-primary"
                          : "bg-primary")}>
                      {isTask ? <CheckSquare size={12} /> : <FolderOpen size={12} />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink dark:text-paper truncate">
                        {item.title}
                      </p>

                      {isTask && item.projectName && (
                        <p className="text-[11px] text-slate dark:text-slate-dark truncate">
                          {item.projectName}
                          {item.listName ? ` · ${item.listName}` : ""}
                        </p>
                      )}
                    </div>
                  </button>
                )})}
            </div>
          </div>
        )})}
    </div>
  )}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-12 w-12 rounded-md bg-paper dark:bg-paper-dark flex items-center justify-center mb-4">
        <CalendarX className="text-primary" size={22} />
      </div>

      <p className="font-medium text-ink dark:text-paper">Nothing on the calendar yet</p>

      <p className="text-sm text-slate dark:text-slate-dark mt-1 max-w-xs">
        Tasks assigned to you and projects with due dates will show up here.
      </p>
    </div>
  )}

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
    children?: React.ReactNode}) {
    return (
      <div
        onMouseEnter={(e) => setHovered({ item: event, x: e.clientX, y: e.clientY })}
        onMouseMove={(e) => setHovered({ item: event, x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setHovered(null)}>
        {children}
      </div>
    )})

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
        listName: task.list.name,}))

    const projectItems: CalendarItem[] = projects
      .filter((project) => !!project.dueDate)
      .map((project) => ({
        id: `project-${project.id}`,
        title: project.name,
        date: startOfDay(new Date(project.dueDate)),
        type: "project",
        projectId: project.id,}))

    return [...taskItems, ...projectItems].sort((a, b) => a.date.getTime() - b.date.getTime())}, [tasks, projects])

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>()

    for (const item of items) {
      const key = format(item.date, "yyyy-MM-dd")
      const existing = map.get(key)

      if (existing) existing.push(item)
      else map.set(key, [item])}

    return map}, [items])

  const groupedItems = useMemo(
    () =>
      Array.from(itemsByDay.entries()).map(([dateKey, groupItems]) => ({
        dateKey,
        date: groupItems[0].date,
        items: groupItems,})),
    [itemsByDay]
  )

  // only the month grid needs start/end/allday, so it gets added here
  // instead of carrying it through the whole calendaritem type
  const monthEvents = useMemo(
    () => items.map((item) => ({ ...item, start: item.date, end: item.date, allDay: true })),
    [items]
  )

  const eventPropGetter = (event: CalendarItem) => ({
    className: event.type === "project" ? "event-project" : `event-task-${event.priority ?? "medium"}`,})

  function handleItemClick(item: CalendarItem) {
    setHovered(null)
    router.push(`/projects/${item.projectId}`)}

  function handleNavigate(dir: "PREV" | "NEXT") {
    const delta = dir === "PREV" ? -1 : 1

    setCursorDate((prev) => (view === "month" ? addMonths(prev, delta) : addDays(prev, delta * 7)))}

  function handleToday() {
    const now = new Date()

    setCursorDate(now)

    if (view === "agenda") {
      todayGroupRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}}

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-line dark:border-line-dark bg-surface dark:bg-surface-dark p-4 sm:p-6">
        <EmptyState />
      </div>
    )}

  return (
    <div className="rounded-md border border-line dark:border-line-dark bg-surface dark:bg-surface-dark p-4 sm:p-6">
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
  )}