import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  labels,
  lists,
  projectMembers,
  projects,
  taskLabels,
  tasks,
  users,
  type NewLabel,
  type NewList,
  type NewProject,
  type NewProjectMember,
  type NewTask,
  type ProjectMember,
} from "@/lib/db/schema"

// PROJECTS

/**
 * Projects a user can see on the projects list: ones they own, plus ones
 * they've been added to as a member. Previously this only checked
 * `ownerId`, so members never saw projects they'd been added to — fixed by
 * also matching against their project_members rows.
 */
export async function getProjectsForUser(userId: string) {
  const memberships = await db.query.projectMembers.findMany({
    where: eq(projectMembers.userId, userId),
    columns: { projectId: true },
  })
  const memberProjectIds = memberships.map((m) => m.projectId)

  const rows = await db.query.projects.findMany({
    where:
      memberProjectIds.length > 0
        ? or(eq(projects.ownerId, userId), inArray(projects.id, memberProjectIds))
        : eq(projects.ownerId, userId),
    orderBy: [asc(projects.createdAt)],
    with: {
      owner: { columns: { id: true, name: true } },
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
      // New fields, additive — existing consumers that don't read these are
      // unaffected. Lets the list UI distinguish "yours" from "shared with
      // you" if you want to show that.
      isOwner: project.ownerId === userId,
      ownerName: project.owner.name,
    }
  })
}

/**
 * Projects a user can access: ones they own, plus ones they've been added
 * to as a member. Used for the project detail page's access check now that
 * members (not just the owner) are allowed to view a project.
 */
export async function getAccessibleProjectIds(userId: string) {
  const owned = await db.query.projects.findMany({
    where: eq(projects.ownerId, userId),
    columns: { id: true },
  })
  const memberOf = await db.query.projectMembers.findMany({
    where: eq(projectMembers.userId, userId),
    columns: { projectId: true },
  })
  return new Set([...owned.map((p) => p.id), ...memberOf.map((m) => m.projectId)])
}

/** Detail view: project + owner + members + lists + tasks, ordered for the board. */
export async function getProjectById(projectId: string) {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    with: {
      owner: true,
      members: { with: { user: true } },
      labels: { orderBy: [asc(labels.createdAt)] },
      lists: {
        orderBy: [asc(lists.position)],
        with: {
          tasks: {
            orderBy: [asc(tasks.position)],
            with: {
              assignee: true,
              taskLabels: { with: { label: true } },
            },
          },
        },
      },
    },
  })

  if (!project) return project

  // Flatten the task_labels join rows into a plain `labels` array so every
  // consumer (the board store, TaskCard, CreateTaskModal) works with the
  // same TaskWithLabels shape, whether the task just came from this query
  // or from createTaskAction/updateTaskAction.
  return {
    ...project,
    lists: project.lists.map((list) => ({
      ...list,
      tasks: list.tasks.map(({ taskLabels: taskLabelRows, ...task }) => ({
        ...task,
        labels: taskLabelRows.map((tl) => tl.label),
      })),
    })),
  }
}

/**
 * User ids allowed to be assigned tasks in this project: the owner plus
 * everyone in project_members. Used to validate `assigneeId` on task
 * create/update so a task can't be assigned to someone outside the project.
 */
export async function getAssignableUserIds(projectId: string) {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    columns: { ownerId: true },
    with: {
      members: { columns: { userId: true } },
    },
  })
  if (!project) return []
  return [project.ownerId, ...project.members.map((m) => m.userId)]
}

/**
 * Label ids that belong to this project. Used to validate `labelIds` on
 * task create/update so a task can't be tagged with another project's label.
 */
export async function getProjectLabelIds(projectId: string) {
  const rows = await db.query.labels.findMany({
    where: eq(labels.projectId, projectId),
    columns: { id: true },
  })
  return rows.map((l) => l.id)
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

// LABELS

export async function getLabelsForProject(projectId: string) {
  return db.query.labels.findMany({
    where: eq(labels.projectId, projectId),
    orderBy: [asc(labels.createdAt)],
  })
}

export async function createLabel(data: NewLabel) {
  const [label] = await db.insert(labels).values(data).returning()
  return label
}

export async function updateLabel(
  labelId: string,
  data: Partial<Pick<NewLabel, "name" | "color">>
) {
  const [label] = await db.update(labels).set(data).where(eq(labels.id, labelId)).returning()
  return label ?? null
}

export async function deleteLabel(labelId: string) {
  await db.delete(labels).where(eq(labels.id, labelId))
}

// labels are owner-managed only, so this checks projects.ownerId same as ownsProject
export async function ownsLabel(labelId: string, userId: string) {
  const label = await db.query.labels.findFirst({
    where: eq(labels.id, labelId),
    with: { project: { columns: { ownerId: true } } },
  })
  return label?.project.ownerId === userId
}

/**
 * Replaces a task's full label set with `labelIds`. Called from the task
 * create/update actions rather than exposed as its own server action —
 * labels are always edited as a set from the task modal, not incrementally.
 */
export async function setTaskLabels(taskId: string, labelIds: string[]) {
  await db.delete(taskLabels).where(eq(taskLabels.taskId, taskId))
  if (labelIds.length === 0) return
  await db.insert(taskLabels).values(labelIds.map((labelId) => ({ taskId, labelId })))
}

export async function getLabelsForTask(taskId: string) {
  const rows = await db.query.taskLabels.findMany({
    where: eq(taskLabels.taskId, taskId),
    with: { label: true },
  })
  return rows.map((r) => r.label)
}

// PROJECT MEMBERS

export async function findUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  return user ?? null
}

export async function getProjectMember(projectId: string, userId: string) {
  return db.query.projectMembers.findFirst({
    where: and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)),
  })
}

export async function getProjectMemberById(memberId: string) {
  return db.query.projectMembers.findFirst({
    where: eq(projectMembers.id, memberId),
  })
}

export async function addProjectMember(data: NewProjectMember) {
  const [member] = await db.insert(projectMembers).values(data).returning()
  return member
}

export async function updateProjectMemberRole(memberId: string, role: ProjectMember["role"]) {
  const [member] = await db
    .update(projectMembers)
    .set({ role })
    .where(eq(projectMembers.id, memberId))
    .returning()
  return member ?? null
}

export async function removeProjectMember(memberId: string) {
  await db.delete(projectMembers).where(eq(projectMembers.id, memberId))
}

/** Owner or member — used to gate project-detail page access. */
export async function canAccessProject(projectId: string, userId: string) {
  const owns = await ownsProject(projectId, userId)
  if (owns) return true
  const member = await getProjectMember(projectId, userId)
  return !!member
}

/**
 * Everyone the given user shares a project with — as the owner of a
 * project they're a member on, or as a fellow member of a project they
 * own/belong to. Powers the Team page. A person can show up once per
 * project they're connected through, each with that project's role, since
 * the same two people can have different roles on different projects.
 */
export async function getTeammatesForUser(userId: string) {
  const owned = await db.query.projects.findMany({
    where: eq(projects.ownerId, userId),
    columns: { id: true, name: true },
    with: {
      members: { with: { user: true } },
    },
  })

  const memberships = await db.query.projectMembers.findMany({
    where: eq(projectMembers.userId, userId),
    columns: { projectId: true },
  })
  const memberOfIds = memberships.map((m) => m.projectId)

  const memberOf = memberOfIds.length
    ? await db.query.projects.findMany({
        where: inArray(projects.id, memberOfIds),
        columns: { id: true, name: true },
        with: {
          owner: true,
          members: { with: { user: true } },
        },
      })
    : []

  type Teammate = {
    id: string
    name: string
    email: string
    projects: { projectId: string; projectName: string; role: string }[]
  }
  const teammates = new Map<string, Teammate>()

  function addTeammate(
    person: { id: string; name: string; email: string },
    projectId: string,
    projectName: string,
    role: string
  ) {
    if (person.id === userId) return
    const entry = { projectId, projectName, role }
    const existing = teammates.get(person.id)
    if (existing) {
      existing.projects.push(entry)
    } else {
      teammates.set(person.id, {
        id: person.id,
        name: person.name,
        email: person.email,
        projects: [entry],
      })
    }
  }

  // Projects the user owns: every member on them is a teammate.
  for (const project of owned) {
    for (const m of project.members) {
      addTeammate(m.user, project.id, project.name, m.role)
    }
  }

  // Projects the user is a member on: the owner and every other member
  // are teammates too.
  for (const project of memberOf) {
    addTeammate(project.owner, project.id, project.name, "owner")
    for (const m of project.members) {
      addTeammate(m.user, project.id, project.name, m.role)
    }
  }

  return Array.from(teammates.values()).sort((a, b) => a.name.localeCompare(b.name))
}