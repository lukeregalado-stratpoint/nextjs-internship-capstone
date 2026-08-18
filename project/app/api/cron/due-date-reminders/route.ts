import { NextResponse } from "next/server"
import { and, eq, gte, isNull, lte } from "drizzle-orm"
import { db } from "@/lib/db"
import { tasks } from "@/lib/db/schema"
import { notifyUser } from "@/lib/notifications"

export const dynamic = "force-dynamic"

/**
 * Runs once a day (see vercel.json). Notifies each task's assignee when the
 * task is due within the next 24h. Guarded by `dueReminderSentAt` so a task
 * only gets one reminder per deadline, not one per cron run — that guard is
 * cleared automatically if the due date is later pushed back
 * (updateTaskAction in lib/actions/tasks.ts).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const dueSoonTasks = await db.query.tasks.findMany({
    where: and(gte(tasks.dueDate, now), lte(tasks.dueDate, in24h), isNull(tasks.dueReminderSentAt)),
    columns: { id: true, title: true, assigneeId: true, listId: true },
    with: { list: { columns: { projectId: true } } },
  })

  let sent = 0
  for (const task of dueSoonTasks) {
    if (!task.assigneeId) continue
    await notifyUser({
      recipientId: task.assigneeId,
      type: "due_date_reminder",
      taskId: task.id,
      projectId: task.list.projectId,
      title: "Task due soon",
      body: task.title,
    })
    await db.update(tasks).set({ dueReminderSentAt: now }).where(eq(tasks.id, task.id))
    sent++
  }

  return NextResponse.json({ sent })
}