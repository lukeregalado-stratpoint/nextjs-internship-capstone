"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

// recharts svg fills can't read tailwind classes, but they CAN read CSS
// custom properties directly, so we point at the same tokens globals.css
// defines instead of hardcoding hex here. --color-primary is the only one
// of these that changes between light/dark (via the --primary HSL var);
// the done/blocked/review mid-tones are intentionally theme-stable per
// their "mid tone for icons/borders" design in globals.css.
const COLORS = {
  primary: "var(--color-primary)",
  done: "var(--color-done)",
  blocked: "var(--color-blocked)",
  review: "var(--color-review)",
  slate: "var(--color-slate)",
}

const PRIORITY_COLORS: Record<string, string> = {
  high: COLORS.blocked,
  medium: COLORS.review,
  low: COLORS.done,
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface dark:bg-surface-dark border border-line dark:border-line-dark rounded-md px-3 py-2 text-sm">
      {label && <p className="font-medium text-ink dark:text-paper mb-1">{label}</p>}
      {payload.map((entry: any) => (
        <p key={entry.dataKey} style={{ color: entry.color || entry.payload.fill }}>
          {entry.name ?? entry.dataKey}: {entry.value}
        </p>
      ))}
    </div>
  )
}

interface ProjectProgress {
  id: string
  name: string
  taskCount: number
  progress: number
}

export function ProjectProgressChart({ data }: { data: ProjectProgress[] }) {
  if (data.length === 0) {
    return <EmptyState message="no projects yet" />
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12, fill: "var(--chart-text)" }}
          axisLine={false}
          tickLine={false}
          interval={0}
          angle={data.length > 4 ? -20 : 0}
          textAnchor={data.length > 4 ? "end" : "middle"}
          height={data.length > 4 ? 40 : 24}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 12, fill: "var(--chart-text)" }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "color-mix(in srgb, var(--color-primary) 8%, transparent)" }} />
        <Bar dataKey="progress" name="progress %" fill={COLORS.primary} radius={[6, 6, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  )
}

interface ActivityPoint {
  date: string
  count: number
}

export function ActivityTimelineChart({ data }: { data: ActivityPoint[] }) {
  if (data.every((d) => d.count === 0)) {
    return <EmptyState message="no activity in this window" />
  }

  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  }))

  return (
    <ResponsiveContainer width="100%" height={256}>
      <LineChart data={formatted} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: "var(--chart-text)" }}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 12, fill: "var(--chart-text)" }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip content={<ChartTooltip />} />
        <Line
          type="monotone"
          dataKey="count"
          name="activity"
          stroke={COLORS.review}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

interface PriorityBreakdown {
  priority: string
  count: number
}

export function PriorityBreakdownChart({ data, compact = false }: { data: PriorityBreakdown[]; compact?: boolean }) {
  if (data.length === 0 || data.every((d) => d.count === 0)) {
    return <EmptyState message="no tasks yet" className={compact ? "h-24" : "h-64"} />
  }

  const pie = (
    <ResponsiveContainer width="100%" height={compact ? 110 : 160}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="priority"
          innerRadius={compact ? 28 : 36}
          outerRadius={compact ? 46 : 60}
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((entry) => (
            <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority] ?? COLORS.slate} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  )

  const legend = (
    <div className={compact ? "flex flex-wrap justify-center gap-x-3 gap-y-1" : "space-y-2"}>
      {data.map((entry) => (
        <div key={entry.priority} className="flex items-center gap-2 text-sm">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: PRIORITY_COLORS[entry.priority] ?? COLORS.slate }}
          />
          <span className="capitalize text-ink dark:text-paper">{entry.priority}</span>
          <span className="text-slate dark:text-slate-dark">{entry.count}</span>
        </div>
      ))}
    </div>
  )

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-2">
        {pie}
        {legend}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <div className="w-[55%]">{pie}</div>
      {legend}
    </div>
  )
}

function EmptyState({ message, className = "h-64" }: { message: string; className?: string }) {
  return (
    <div className={`${className} flex items-center justify-center text-sm text-slate dark:text-slate-dark`}>
      {message}
    </div>
  )
}