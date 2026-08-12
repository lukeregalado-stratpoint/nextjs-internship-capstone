import { requireUser } from "@/lib/auth"
import { getProjectsForCalendar, getTasksForAssigneeCalendar } from "@/lib/db/queries"
import { CalendarView } from "@/components/calendar-view"

export default async function CalendarPage() {
  const user = await requireUser()
  const [tasks, projects] = await Promise.all([
    getTasksForAssigneeCalendar(user.id),
    getProjectsForCalendar(user.id),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-outer_space-500 dark:text-platinum-500">Calendar</h1>
        <p className="text-paynes_gray-500 dark:text-french_gray-500 mt-2">
          Due dates for tasks assigned to you and projects you're part of
        </p>
      </div>

      <CalendarView tasks={tasks} projects={projects} />
    </div>
  )
}