import { and, asc, eq, inArray, isNotNull, lte } from "drizzle-orm"
import { db } from "./index"
import { comments, lists, projects, tasks, users } from "./schema"
import type { NewComment, NewList, NewProject, NewTask } from "./schema"

// DASHBOARD
export async function getDashboardStatsForOwner(ownerId: string) {
  const ownerProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.ownerId, ownerId))

  const projectIds = ownerProjects.map((p) => p.id)

  if (projectIds.length === 0) {
    return { activeProjects: 0, completedTasks: 0, inProgressTasks: 0, backlogTasks: 0 }
  }

  const taskRows = await db
    .select({ listName: lists.name })
    .from(tasks)
    .innerJoin(lists, eq(tasks.listId, lists.id))
    .where(inArray(lists.projectId, projectIds))

  let completedTasks = 0
  let inProgressTasks = 0
  let backlogTasks = 0

  for (const { listName } of taskRows) {
    const normalized = listName.toLowerCase()
    if (normalized.includes("done") || normalized.includes("complete")) {
      completedTasks++
    } else if (normalized.includes("progress") || normalized.includes("doing")) {
      inProgressTasks++
    } else {
      backlogTasks++
    }
  }

  return {
    activeProjects: projectIds.length,
    completedTasks,
    inProgressTasks,
    backlogTasks,
  }
}

// USERS
export async function getUserByClerkId(clerkId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1)
  return user ?? null
}
 
export async function getUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return user ?? null
}


// PROJECTS
export async function getProjectsForOwner(ownerId: string) {
  const ownerProjects = await db.query.projects.findMany({
    where: eq(projects.ownerId, ownerId),
    orderBy: (p, { desc }) => desc(p.updatedAt),
    with: {
      lists: {
        with: {
          tasks: {
            with: { assignee: true },
          },
        },
      },
    },
  })

  return ownerProjects.map(({ lists: projectLists, ...project }) => {
    const memberMap = new Map<string, { id: string; name: string }>()

    for (const list of projectLists) {
      for (const task of list.tasks) {
        if (task.assignee) {
          memberMap.set(task.assignee.id, {
            id: task.assignee.id,
            name: task.assignee.name,
          })
        }
      }
    }

    return { ...project, members: Array.from(memberMap.values()) }
  })
}
 
/** full board: 
 * project 
 * -> lists (ordered) 
 * -> tasks (ordered) with assignees. */
export async function getProjectWithBoard(projectId: string) {
  return db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    with: {
      owner: true,
      lists: {
        orderBy: asc(lists.position),
        with: {
          tasks: {
            orderBy: asc(tasks.position),
            with: { assignee: true },
          },
        },
      },
    },
  })
}

export async function ownsProject(projectId: string, userId: string) {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    columns: { ownerId: true },
  })
  return project?.ownerId === userId
}
 
export async function createProject(input: NewProject) {
  const [project] = await db.insert(projects).values(input).returning()
  return project
}
 
export async function updateProject(
  projectId: string,
  input: Partial<Omit<NewProject, "id" | "ownerId">>
) {
  const [project] = await db
    .update(projects)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .returning()
  return project
}
 
export async function deleteProject(projectId: string) {
  await db.delete(projects).where(eq(projects.id, projectId))
}

export async function getListsForProject(projectId: string) {
  return db.query.lists.findMany({
    where: eq(lists.projectId, projectId),
    orderBy: asc(lists.position),
  })
}
 
/** create list to end of project's board */
export async function createList(input: Omit<NewList, "position">) {
  const existing = await db
    .select({ position: lists.position })
    .from(lists)
    .where(eq(lists.projectId, input.projectId))
 
  const nextPosition = existing.length
    ? Math.max(...existing.map((l) => l.position)) + 1
    : 0
 
  const [list] = await db
    .insert(lists)
    .values({ ...input, position: nextPosition })
    .returning()
  return list
}
 
export async function updateList(
  listId: string,
  input: Partial<Pick<NewList, "name" | "position">>
) {
  const [list] = await db
    .update(lists)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(lists.id, listId))
    .returning()
  return list
}
 
export async function deleteList(listId: string) {
  await db.delete(lists).where(eq(lists.id, listId))
}
 
// TASKS
 
export async function getTasksForProject(projectId: string) {
  return db
    .select({ task: tasks })
    .from(tasks)
    .innerJoin(lists, eq(tasks.listId, lists.id))
    .where(eq(lists.projectId, projectId))
    .then((rows) => rows.map((r) => r.task))
}
 
/** append: new task at the end of a list */
export async function createTask(input: Omit<NewTask, "position">) {
  const existing = await db
    .select({ position: tasks.position })
    .from(tasks)
    .where(eq(tasks.listId, input.listId))
 
  const nextPosition = existing.length
    ? Math.max(...existing.map((t) => t.position)) + 1
    : 0
 
  const [task] = await db
    .insert(tasks)
    .values({ ...input, position: nextPosition })
    .returning()
  return task
}
 
export async function updateTask(
  taskId: string,
  input: Partial<
    Pick<
      NewTask,
      "title" | "description" | "assigneeId" | "priority" | "dueDate"
    >
  >
) {
  const [task] = await db
    .update(tasks)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(tasks.id, taskId))
    .returning()
  return task
}
 
/** move task to new list OR position */
export async function moveTask(
  taskId: string,
  toListId: string,
  toPosition: number
) {
  const [task] = await db
    .update(tasks)
    .set({ listId: toListId, position: toPosition, updatedAt: new Date() })
    .where(eq(tasks.id, taskId))
    .returning()
  return task
}
 
export async function deleteTask(taskId: string) {
  await db.delete(tasks).where(eq(tasks.id, taskId))
}
 
// COMMENTS
export async function getCommentsForTask(taskId: string) {
  return db.query.comments.findMany({
    where: eq(comments.taskId, taskId),
    orderBy: (c, { asc }) => asc(c.createdAt),
    with: { author: true },
  })
}
 
export async function createComment(input: NewComment) {
  const [comment] = await db.insert(comments).values(input).returning()
  return comment
}
 
export async function deleteComment(commentId: string) {
  await db.delete(comments).where(eq(comments.id, commentId))
}
 
export async function isCommentAuthor(commentId: string, userId: string) {
  const comment = await db.query.comments.findFirst({
    where: and(eq(comments.id, commentId), eq(comments.authorId, userId)),
    columns: { id: true },
  })
  return Boolean(comment)
}
