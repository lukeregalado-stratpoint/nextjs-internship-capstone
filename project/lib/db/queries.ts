import { and, asc, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { lists, projects, tasks, type NewList, type NewProject } from "@/lib/db/schema"

// =========================================================
// Projects
// =========================================================

/**
 * Listing view: one row per project the user owns, with the counts
 * needed for the project cards (members, tasks, columns, progress).
 *
 * Convention: the right-most column (highest `position`) is treated
 * as "Done" for the purposes of the progress bar. This avoids adding
 * a status/boolean column to `tasks` for now — revisit if you want a
 * project to have more than one "done-like" column.
 */
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

/**
 * Ownership check used by the server actions before any mutation.
 * NOTE: this only checks `projects.ownerId`. `projectMembers` (with
 * roles like product_owner/scrum_master) exists in the schema but
 * isn't wired into permissions yet — extend this if members other
 * than the owner should be able to edit/delete.
 */
export async function ownsProject(projectId: string, userId: string) {
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.ownerId, userId)),
    columns: { id: true },
  })
  return !!project
}

/**
 * Dashboard view: projects owned by the user, most-recently-updated first,
 * with members (and each member's user) loaded for the avatar stack in
 * RecentProjects. Callers slice to however many they want to show.
 */
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

/**
 * Dashboard stat tiles. Reuses the same "right-most column = done, first
 * column = backlog, everything between = in progress" convention as the
 * project-card progress bar (see getProjectsForUser above), since `tasks`
 * has no explicit status column yet.
 *
 * - A project with a single list: all its tasks count as backlog (a lone
 *   column isn't necessarily "done").
 * - `activeProjects` is just a count of projects owned by the user — there's
 *   no archived/completed state on `projects` yet to distinguish "active"
 *   from anything else.
 */
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

/** Persists a full reorder. Called after a drag-and-drop reorder on the board. */
export async function reorderLists(projectId: string, orderedListIds: string[]) {
  await Promise.all(
    orderedListIds.map((id, index) =>
      db
        .update(lists)
        .set({ position: index, updatedAt: new Date() })
        .where(and(eq(lists.id, id), eq(lists.projectId, projectId)))
    )
  )
}

export async function ownsList(listId: string, userId: string) {
  const list = await db.query.lists.findFirst({
    where: eq(lists.id, listId),
    with: { project: { columns: { ownerId: true } } },
  })
  return list?.project.ownerId === userId
}