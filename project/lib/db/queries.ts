import { and, asc, desc, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { lists, projects, tasks, type NewList, type NewProject, type NewTask } from "@/lib/db/schema"

// PROJECTS
export async function getProjectsForUser(userId: string) {
  const rows = await db.query.projects.findMany({
    where: eq(projects.ownerId, userId),
    orderBy: [asc(projects.createdAt)],
    with: {
      members: true,
      lists: {
        orderBy: [asc(lists.position)],
        with: { tasks: true },
      },
    },
  })

  return rows.map((project) => {
    const allTasks = project.lists.flatMap((l) => l.tasks)
    const lastList = project.lists[project.lists.length - 1]
    const doneCount = lastList?.tasks.length ?? 0

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      dueDate: project.dueDate,
      createdAt: project.createdAt,
      memberCount: project.members.length + 1, // +1 for the owner
      taskCount: allTasks.length,
      listCount: project.lists.length,
      progress: allTasks.length === 0 ? 0 : Math.round((doneCount / allTasks.length) * 100),
    }
  })
}

/** Detail view: project + owner + members + lists + tasks, ordered for the board. */
export async function getProjectById(projectId: string) {
  return db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    with: {
      owner: true,
      members: { with: { user: true } },
      lists: {
        orderBy: [asc(lists.position)],
        with: {
          tasks: { orderBy: [asc(tasks.position)] },
        },
      },
    },
  })
}

export async function createProject(data: NewProject) {
  const [project] = await db.insert(projects).values(data).returning()
  return project
}

export async function updateProject(
  projectId: string,
  data: Partial<Omit<NewProject, "id" | "ownerId">>
) {
  const [project] = await db
    .update(projects)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .returning()
  return project ?? null
}

export async function deleteProject(projectId: string) {
  await db.delete(projects).where(eq(projects.id, projectId))
}

// projects.ownderId only
export async function ownsProject(projectId: string, userId: string) {
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.ownerId, userId)),
    columns: { id: true },
  })
  return !!project
}

export async function getProjectsForOwner(userId: string) {
  return db.query.projects.findMany({
    where: eq(projects.ownerId, userId),
    orderBy: [desc(projects.updatedAt)],
    with: {
      members: {
        with: { user: { columns: { id: true, name: true } } },
      },
    },
  })
}

export async function getDashboardStatsForOwner(userId: string) {
  const rows = await db.query.projects.findMany({
    where: eq(projects.ownerId, userId),
    with: {
      lists: {
        orderBy: [asc(lists.position)],
        with: { tasks: { columns: { id: true } } },
      },
    },
  })

  let completedTasks = 0
  let inProgressTasks = 0
  let backlogTasks = 0

  for (const project of rows) {
    const projectLists = project.lists
    if (projectLists.length === 0) continue

    if (projectLists.length === 1) {
      backlogTasks += projectLists[0].tasks.length
      continue
    }

    const first = projectLists[0]
    const last = projectLists[projectLists.length - 1]
    const middle = projectLists.slice(1, -1)

    backlogTasks += first.tasks.length
    completedTasks += last.tasks.length
    inProgressTasks += middle.reduce((sum, l) => sum + l.tasks.length, 0)
  }

  return {
    activeProjects: rows.length,
    completedTasks,
    inProgressTasks,
    backlogTasks,
  }
}

// LISTS 
export async function getListsForProject(projectId: string) {
  return db.query.lists.findMany({
    where: eq(lists.projectId, projectId),
    orderBy: [asc(lists.position)],
  })
}

export async function getNextListPosition(projectId: string) {
  const existing = await db.query.lists.findMany({
    where: eq(lists.projectId, projectId),
    columns: { position: true },
  })
  if (existing.length === 0) return 0
  return Math.max(...existing.map((l) => l.position)) + 1
}

export async function createList(data: NewList) {
  const [list] = await db.insert(lists).values(data).returning()
  return list
}

export async function updateList(
  listId: string,
  data: Partial<Pick<NewList, "name" | "position">>
) {
  const [list] = await db
    .update(lists)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(lists.id, listId))
    .returning()
  return list ?? null
}

export async function deleteList(listId: string) {
  await db.delete(lists).where(eq(lists.id, listId))
}

/** reorders lists. called after drag and drop  */
export async function reorderLists(projectId: string, orderedListIds: string[]) {
  if (orderedListIds.length === 0) return

  const positionCase = sql.join(
    orderedListIds.map((id, index) => sql`WHEN ${id} THEN ${index}`),
    sql` `
  )

  await db.execute(sql`
    UPDATE lists
    SET position = CASE id
      ${positionCase}
      ELSE position
    END,
    updated_at = now()
    WHERE project_id = ${projectId}
      AND id IN ${orderedListIds}
  `)
}

export async function ownsList(listId: string, userId: string) {
  const list = await db.query.lists.findFirst({
    where: eq(lists.id, listId),
    with: { project: { columns: { ownerId: true } } },
  })
  return list?.project.ownerId === userId
}

// TASKS

export async function getNextTaskPosition(listId: string) {
  const existing = await db.query.tasks.findMany({
    where: eq(tasks.listId, listId),
    columns: { position: true },
  })
  if (existing.length === 0) return 0
  return Math.max(...existing.map((t) => t.position)) + 1
}

export async function createTask(data: NewTask) {
  const [task] = await db.insert(tasks).values(data).returning()
  return task
}

export async function updateTask(taskId: string, data: Partial<Omit<NewTask, "id">>) {
  const [task] = await db
    .update(tasks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tasks.id, taskId))
    .returning()
  return task ?? null
}

export async function deleteTask(taskId: string) {
  await db.delete(tasks).where(eq(tasks.id, taskId))
}

/**
 * for drag + drop of tasks across/within columns
 */
export async function moveTask(taskId: string, destListId: string, orderedTaskIds: string[]) {
  await db
    .update(tasks)
    .set({ listId: destListId, updatedAt: new Date() })
    .where(eq(tasks.id, taskId))

  await Promise.all(
    orderedTaskIds.map((id, index) =>
      db
        .update(tasks)
        .set({ position: index, updatedAt: new Date() })
        .where(and(eq(tasks.id, id), eq(tasks.listId, destListId)))
    )
  )
}

export async function ownsTask(taskId: string, userId: string) {
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: { list: { with: { project: { columns: { ownerId: true } } } } },
  })
  return task?.list.project.ownerId === userId
}