import { and, asc, desc, eq, gte, ilike, inArray, isNotNull, isNull, notInArray, or, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  activities,
  comments,
  labels,
  lists,
  notificationPreferences,
  notifications,
  projectInvitations,
  projectMembers,
  projects,
  taskLabels,
  tasks,
  users,
  type ActivityType,
  type InvitationStatus,
  type NewActivity,
  type NewComment,
  type NewLabel,
  type NewList,
  type NewNotification,
  type NewNotificationPreferences,
  type NewProject,
  type NewProjectInvitation,
  type NewProjectMember,
  type NewTask,
  type NotificationPreferences,
  type NotificationType,
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
        // Only `id` is used below (for counts/progress) — pulling full
        // task rows (title, description, dates, etc.) here was shipping
        // every field of every task on the projects list page for no
        // reason.
        with: { tasks: { columns: { id: true } } },
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

/** Just id/name — used to compose notification text without pulling the full project graph. */
export async function getProjectSummary(projectId: string) {
  const [project] = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  return project ?? null
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
  const ownedProjects = await db.query.projects.findMany({
    where: eq(projects.ownerId, userId),
    columns: { id: true },
  })
  const projectIds = ownedProjects.map((p) => p.id)

  if (projectIds.length === 0) {
    return { activeProjects: 0, completedTasks: 0, inProgressTasks: 0, backlogTasks: 0 }
  }

  // Per-list task counts computed with COUNT/GROUP BY, instead of pulling
  // every task row across every project just to add them up in JS. Only
  // scales with (number of lists), not (number of tasks).
  const listTaskCounts = db
    .select({
      projectId: lists.projectId,
      position: lists.position,
      taskCount: sql<number>`count(${tasks.id})`.as("task_count"),
    })
    .from(lists)
    .leftJoin(tasks, eq(tasks.listId, lists.id))
    .where(inArray(lists.projectId, projectIds))
    .groupBy(lists.id)
    .as("list_task_counts")

  // Rank each list within its project by position so its count can be
  // bucketed as backlog (first list) / done (last list) / in-progress
  // (everything between) — same semantics as the board's columns.
  const rows = await db
    .select({
      rank: sql<number>`row_number() over (partition by ${listTaskCounts.projectId} order by ${listTaskCounts.position} asc)`,
      listCount: sql<number>`count(*) over (partition by ${listTaskCounts.projectId})`,
      taskCount: listTaskCounts.taskCount,
    })
    .from(listTaskCounts)

  let completedTasks = 0
  let inProgressTasks = 0
  let backlogTasks = 0

  for (const row of rows) {
    const taskCount = Number(row.taskCount)
    const rank = Number(row.rank)
    const listCount = Number(row.listCount)

    if (listCount === 1 || rank === 1) {
      backlogTasks += taskCount
    } else if (rank === listCount) {
      completedTasks += taskCount
    } else {
      inProgressTasks += taskCount
    }
  }

  return {
    activeProjects: projectIds.length,
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
  const [row] = await db
    .select({ maxPosition: sql<number | null>`max(${lists.position})` })
    .from(lists)
    .where(eq(lists.projectId, projectId))
  return (row?.maxPosition ?? -1) + 1
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

export async function getListById(listId: string) {
  return db.query.lists.findFirst({
    where: eq(lists.id, listId),
    columns: { id: true, name: true },
  })
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
  const [row] = await db
    .select({ maxPosition: sql<number | null>`max(${tasks.position})` })
    .from(tasks)
    .where(eq(tasks.listId, listId))
  return (row?.maxPosition ?? -1) + 1
}

export async function getTaskById(taskId: string) {
  return db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: {
      list: { columns: { id: true, name: true } },
      assignee: { columns: { id: true, name: true } },
    },
  })
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

  if (orderedTaskIds.length === 0) return

  // Same batched-update pattern as reorderLists below: one round trip for
  // the whole destination column instead of one UPDATE per task.
  const positionCase = sql.join(
    orderedTaskIds.map((id, index) => sql`WHEN ${id} THEN ${index}`),
    sql` `
  )

  await db.execute(sql`
    UPDATE tasks
    SET position = CASE id
      ${positionCase}
      ELSE position
    END,
    updated_at = now()
    WHERE list_id = ${destListId}
      AND id IN ${orderedTaskIds}
  `)
}

export async function ownsTask(taskId: string, userId: string) {
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: { list: { with: { project: { columns: { ownerId: true } } } } },
  })
  return task?.list.project.ownerId === userId
}

/**
 * Owner OR project member. Editing/moving a task is still owner-only
 * (see `ownsTask`), but commenting is a collaborative action — every
 * member assigned to the project should be able to leave a comment on a
 * task, not just the owner.
 */
export async function canAccessTask(taskId: string, userId: string) {
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: {
      list: {
        with: {
          project: {
            columns: { ownerId: true },
            with: { members: { columns: { userId: true } } },
          },
        },
      },
    },
  })
  if (!task) return false
  const project = task.list.project
  return project.ownerId === userId || project.members.some((m) => m.userId === userId)
}

// BULK TASK OPERATIONS (task 5 — multi-select actions on the board)

/**
 * All of `taskIds` must exist AND belong to a list owned by `userId`, same
 * ownership rule as `ownsTask`. A mismatched count (some id doesn't exist,
 * or points at another user's task) fails the whole batch — bulk actions
 * are all-or-nothing rather than silently skipping tasks the caller
 * shouldn't have been able to select in the first place.
 */
export async function ownsTasks(taskIds: string[], userId: string) {
  if (taskIds.length === 0) return false
  const rows = await db.query.tasks.findMany({
    where: inArray(tasks.id, taskIds),
    with: { list: { with: { project: { columns: { ownerId: true } } } } },
  })
  if (rows.length !== taskIds.length) return false
  return rows.every((t) => t.list.project.ownerId === userId)
}

export async function bulkDeleteTasks(taskIds: string[]) {
  if (taskIds.length === 0) return
  await db.delete(tasks).where(inArray(tasks.id, taskIds))
}

/**
 * Applies the same field updates to a set of tasks at once — priority,
 * assignee, and/or moving them all to a different list. Unlike `moveTask`
 * (drag-and-drop of a single task, which takes an explicit full ordering
 * for the destination list), a bulk move just appends the selected tasks
 * to the end of the destination list in the order they were passed.
 */
export async function bulkUpdateTasks(
  taskIds: string[],
  data: Partial<Pick<NewTask, "priority" | "assigneeId" | "listId">>
) {
  if (taskIds.length === 0) return []

  if (data.listId) {
    const startPosition = await getNextTaskPosition(data.listId)
    const positionCase = sql.join(
      taskIds.map((id, index) => sql`WHEN ${id} THEN ${startPosition + index}`),
      sql` `
    )

    return db
      .update(tasks)
      .set({
        ...data,
        position: sql`CASE id ${positionCase} ELSE position END`,
        updatedAt: new Date(),
      })
      .where(inArray(tasks.id, taskIds))
      .returning()
  }

  return db
    .update(tasks)
    .set({ ...data, updatedAt: new Date() })
    .where(inArray(tasks.id, taskIds))
    .returning()
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

export async function getUserById(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  return user ?? null
}

/**
 * Registered users matching `query` against name or email, for the "add
 * member" autocomplete. Scoped to a project: the owner and everyone already
 * on the project are excluded so results only show people who could
 * actually be added. Deliberately NOT exposed for a global/unscoped user
 * search — see the advisory note on task 4, this keeps the picker from
 * leaking the full user directory outside the context of a specific project.
 */
export async function searchUsersForProject(projectId: string, query: string, limit = 8) {
  const trimmed = query.trim()
  if (!trimmed) return []

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    columns: { ownerId: true },
    with: { members: { columns: { userId: true } } },
  })
  if (!project) return []

  const pendingInvites = await db.query.projectInvitations.findMany({
    where: and(eq(projectInvitations.projectId, projectId), eq(projectInvitations.status, "pending")),
    columns: { inviteeId: true },
  })

  const excludeIds = [
    project.ownerId,
    ...project.members.map((m) => m.userId),
    ...pendingInvites.map((i) => i.inviteeId),
  ]
  const pattern = `%${trimmed}%`

  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(
      and(
        or(ilike(users.name, pattern), ilike(users.email, pattern)),
        notInArray(users.id, excludeIds)
      )
    )
    .orderBy(asc(users.name))
    .limit(limit)
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

// PROJECT INVITATIONS

/**
 * Creates a pending invitation, or — if this project/invitee pair already
 * has a row (e.g. a previous invite was declined, or expired off-screen) —
 * resets that existing row back to pending with the latest role instead of
 * inserting a duplicate. Relies on the unique index on (projectId,
 * inviteeId). This is the only way a project_members row gets created now;
 * see acceptInvitationAction in lib/actions/invitations.ts.
 */
export async function createOrRefreshInvitation(data: NewProjectInvitation) {
  const [invitation] = await db
    .insert(projectInvitations)
    .values(data)
    .onConflictDoUpdate({
      target: [projectInvitations.projectId, projectInvitations.inviteeId],
      set: {
        inviterId: data.inviterId,
        role: data.role,
        status: "pending",
        createdAt: new Date(),
        respondedAt: null,
      },
    })
    .returning()
  return invitation
}

/** Used to block re-inviting someone who already has an outstanding invite. */
export async function getPendingInvitation(projectId: string, inviteeId: string) {
  return db.query.projectInvitations.findFirst({
    where: and(
      eq(projectInvitations.projectId, projectId),
      eq(projectInvitations.inviteeId, inviteeId),
      eq(projectInvitations.status, "pending")
    ),
  })
}

export async function getInvitationById(invitationId: string) {
  return db.query.projectInvitations.findFirst({
    where: eq(projectInvitations.id, invitationId),
    with: {
      project: { columns: { id: true, name: true, ownerId: true } },
      inviter: { columns: { id: true, name: true, email: true } },
      invitee: { columns: { id: true, name: true, email: true } },
    },
  })
}

/** Pending invitations on a project, for the "manage members" modal's owner-side view. */
export async function getPendingInvitationsForProject(projectId: string) {
  return db.query.projectInvitations.findMany({
    where: and(eq(projectInvitations.projectId, projectId), eq(projectInvitations.status, "pending")),
    orderBy: [desc(projectInvitations.createdAt)],
    with: {
      invitee: { columns: { id: true, name: true, email: true } },
    },
  })
}

/** Pending invitations addressed to a user, for their notification bell / an "invites" list. */
export async function getPendingInvitationsForUser(userId: string) {
  return db.query.projectInvitations.findMany({
    where: and(eq(projectInvitations.inviteeId, userId), eq(projectInvitations.status, "pending")),
    orderBy: [desc(projectInvitations.createdAt)],
    with: {
      project: { columns: { id: true, name: true } },
      inviter: { columns: { id: true, name: true, email: true } },
    },
  })
}

export async function updateInvitationStatus(invitationId: string, status: InvitationStatus) {
  const [invitation] = await db
    .update(projectInvitations)
    .set({ status, respondedAt: new Date() })
    .where(eq(projectInvitations.id, invitationId))
    .returning()
  return invitation ?? null
}

/** Owner revoking a still-pending invite (equivalent of removeProjectMember, pre-acceptance). */
export async function deleteInvitation(invitationId: string) {
  await db.delete(projectInvitations).where(eq(projectInvitations.id, invitationId))
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

// COMMENTS

/** Oldest first, like a normal comment thread. */
export async function getCommentsForTask(taskId: string) {
  return db.query.comments.findMany({
    where: eq(comments.taskId, taskId),
    orderBy: [asc(comments.createdAt)],
    with: { author: { columns: { id: true, name: true } } },
  })
}

export async function createComment(data: NewComment) {
  const [comment] = await db.insert(comments).values(data).returning()
  return comment
}

export async function updateComment(commentId: string, content: string) {
  const [comment] = await db
    .update(comments)
    .set({ content, updatedAt: new Date() })
    .where(eq(comments.id, commentId))
    .returning()
  return comment ?? null
}

export async function deleteComment(commentId: string) {
  await db.delete(comments).where(eq(comments.id, commentId))
}

export async function getCommentById(commentId: string) {
  return db.query.comments.findFirst({ where: eq(comments.id, commentId) })
}

/** Only the person who wrote it can edit/delete their own comment. */
export async function ownsComment(commentId: string, userId: string) {
  const comment = await db.query.comments.findFirst({
    where: eq(comments.id, commentId),
    columns: { authorId: true },
  })
  return comment?.authorId === userId
}

// ACTIVITY

/**
 * Full activity feed for a task, newest first — mirrors the order you'd
 * scroll a changelog in. Comments are stored separately (see above) but
 * a "comment_added"/"comment_deleted" activity row is still logged
 * alongside them so the feed reads as one continuous timeline.
 */
export async function getActivityForTask(taskId: string) {
  return db.query.activities.findMany({
    where: eq(activities.taskId, taskId),
    orderBy: [desc(activities.createdAt)],
    with: { user: { columns: { id: true, name: true } } },
  })
}

export async function createActivity(data: NewActivity) {
  const [activity] = await db.insert(activities).values(data).returning()
  return activity
}

/**
 * Convenience wrapper around `createActivity` for the common case — most
 * call sites just have (taskId, userId, type, metadata) and don't need the
 * raw insert shape. Failures here are swallowed by the caller (see
 * `logActivitySafe` usage in the task actions) since a broken activity log
 * write should never fail the task mutation that triggered it.
 */
export async function logActivity(
  taskId: string,
  userId: string,
  type: ActivityType,
  metadata?: Record<string, unknown>
) {
  return createActivity({ taskId, userId, type, metadata })
}

// NOTIFICATIONS

export async function createNotification(data: NewNotification) {
  const [notification] = await db.insert(notifications).values(data).returning()
  return notification
}

/** Newest first, capped — the dropdown only ever shows a bounded recent list. */
export async function getNotificationsForUser(userId: string, limit = 30) {
  return db.query.notifications.findMany({
    where: eq(notifications.recipientId, userId),
    orderBy: [desc(notifications.createdAt)],
    limit,
    with: {
      actor: { columns: { id: true, name: true } },
    },
  })
}

export async function getUnreadNotificationCount(userId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.recipientId, userId), isNull(notifications.readAt)))
  return Number(row?.count ?? 0)
}

export async function ownsNotification(notificationId: string, userId: string) {
  const notification = await db.query.notifications.findFirst({
    where: eq(notifications.id, notificationId),
    columns: { recipientId: true },
  })
  return notification?.recipientId === userId
}

export async function markNotificationRead(notificationId: string) {
  const [notification] = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(eq(notifications.id, notificationId))
    .returning()
  return notification ?? null
}

export async function markAllNotificationsRead(userId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.recipientId, userId), isNull(notifications.readAt)))
}

// NOTIFICATION PREFERENCES

export async function getNotificationPreferences(userId: string) {
  const [prefs] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
  return prefs ?? null
}

export async function upsertNotificationPreferences(
  userId: string,
  updates: Partial<Pick<NewNotificationPreferences, "taskAssigned" | "commentAdded" | "dueDateReminder">>
) {
  const [prefs] = await db
    .insert(notificationPreferences)
    .values({ userId, ...updates })
    .onConflictDoUpdate({
      target: notificationPreferences.userId,
      set: { ...updates, updatedAt: new Date() },
    })
    .returning()
  return prefs
}

const NOTIFICATION_PREFERENCE_COLUMN_BY_TYPE: Record<NotificationType, keyof NotificationPreferences> = {
  task_assigned: "taskAssigned",
  comment_added: "commentAdded",
  due_date_reminder: "dueDateReminder",
  project_invitation: "projectInvitation",
}

/** No row yet = every type enabled, matching the notificationPreferences column defaults. */
export async function isNotificationTypeEnabled(userId: string, type: NotificationType) {
  const prefs = await getNotificationPreferences(userId)
  if (!prefs) return true
  return prefs[NOTIFICATION_PREFERENCE_COLUMN_BY_TYPE[type]]
}

// ANALYTICS

/**
 * top-level numbers for the analytics page. reuses getDashboardStatsForOwner
 * for the completed/in-progress/backlog split so the two pages can't drift,
 * then layers on completion rate and team size.
 */
export async function getAnalyticsOverviewForOwner(userId: string) {
  const stats = await getDashboardStatsForOwner(userId)
  const totalTasks = stats.completedTasks + stats.inProgressTasks + stats.backlogTasks
  const completionRate = totalTasks === 0 ? 0 : Math.round((stats.completedTasks / totalTasks) * 100)

  const ownedProjects = await db.query.projects.findMany({
    where: eq(projects.ownerId, userId),
    columns: { id: true },
  })
  const projectIds = ownedProjects.map((p) => p.id)

  let teamMembersCount = 0
  if (projectIds.length > 0) {
    const members = await db
      .selectDistinct({ userId: projectMembers.userId })
      .from(projectMembers)
      .where(inArray(projectMembers.projectId, projectIds))
    teamMembersCount = members.length
  }

  return {
    totalTasks,
    completedTasks: stats.completedTasks,
    inProgressTasks: stats.inProgressTasks,
    backlogTasks: stats.backlogTasks,
    completionRate,
    activeProjects: stats.activeProjects,
    teamMembersCount,
  }
}

/**
 * per-project completion %, same "last list = done" definition used by
 * getDashboardStatsForOwner / getProjectsForUser. powers the project
 * progress chart.
 */
export async function getProjectProgressForOwner(userId: string) {
  const projectsData = await db.query.projects.findMany({
    where: eq(projects.ownerId, userId),
    orderBy: [asc(projects.createdAt)],
    with: {
      lists: {
        orderBy: [asc(lists.position)],
        with: { tasks: { columns: { id: true } } },
      },
    },
  })

  return projectsData.map((project) => {
    const allTasks = project.lists.flatMap((l) => l.tasks)
    const lastList = project.lists[project.lists.length - 1]
    const doneCount = lastList?.tasks.length ?? 0

    return {
      id: project.id,
      name: project.name,
      taskCount: allTasks.length,
      progress: allTasks.length === 0 ? 0 : Math.round((doneCount / allTasks.length) * 100),
    }
  })
}

/** task counts by priority, across every project the user owns. */
export async function getPriorityBreakdownForOwner(userId: string) {
  const ownedProjects = await db.query.projects.findMany({
    where: eq(projects.ownerId, userId),
    columns: { id: true },
  })
  const projectIds = ownedProjects.map((p) => p.id)
  if (projectIds.length === 0) return []

  const rows = await db
    .select({
      priority: tasks.priority,
      count: sql<number>`count(${tasks.id})`,
    })
    .from(tasks)
    .innerJoin(lists, eq(tasks.listId, lists.id))
    .where(inArray(lists.projectId, projectIds))
    .groupBy(tasks.priority)

  return rows.map((r) => ({ priority: r.priority, count: Number(r.count) }))
}

/**
 * daily activity counts for the last `days` days, across every task in
 * every project the user owns. zero-fills days with no activity so the
 * chart doesn't show gaps.
 */
export async function getActivityTimelineForOwner(userId: string, days = 14) {
  const ownedProjects = await db.query.projects.findMany({
    where: eq(projects.ownerId, userId),
    columns: { id: true },
  })
  const projectIds = ownedProjects.map((p) => p.id)
  if (projectIds.length === 0) return []

  const since = new Date()
  since.setDate(since.getDate() - (days - 1))
  since.setHours(0, 0, 0, 0)

  const rows = await db
    .select({
      day: sql<string>`date_trunc('day', ${activities.createdAt})`,
      count: sql<number>`count(${activities.id})`,
    })
    .from(activities)
    .innerJoin(tasks, eq(activities.taskId, tasks.id))
    .innerJoin(lists, eq(tasks.listId, lists.id))
    .where(and(inArray(lists.projectId, projectIds), gte(activities.createdAt, since)))
    .groupBy(sql`date_trunc('day', ${activities.createdAt})`)
    .orderBy(sql`date_trunc('day', ${activities.createdAt})`)

  const counts = new Map(rows.map((r) => [new Date(r.day).toISOString().slice(0, 10), Number(r.count)]))

  const result: { date: string; count: number }[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(since)
    d.setDate(d.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    result.push({ date: key, count: counts.get(key) ?? 0 })
  }
  return result
}

// CALENDAR

/**
 * Tasks assigned to `userId` that have a due date, for the calendar page.
 * Deliberately not scoped to projects the user owns — assignment, not
 * ownership, is what should surface a task on someone's personal calendar,
 * so this also picks up tasks assigned to a member on a project they don't
 * own.
 */
// GLOBAL SEARCH (command palette)

/**
 * Lightweight, one-shot search index for the command palette: every
 * accessible project and a bounded set of recently-touched tasks, in two
 * queries instead of the five `globalSearchForUser` runs per keystroke.
 * Unlike `globalSearchForUser`, this takes no `query` — the caller (the
 * palette, via `search-index-store`) fetches this once when it opens and
 * filters client-side, so access-scoping still happens here (server-side,
 * behind `requireUser` in the action) but text matching doesn't need a
 * round trip per character typed.
 *
 * `taskLimit` bounds the payload for users with a lot of history; it's an
 * ORDER BY updatedAt DESC cap, so the palette's local search stays fast
 * without shipping someone's entire task history to the client.
 */
export async function getSearchIndexForUser(userId: string, taskLimit = 300) {
  const accessibleProjectIds = await getAccessibleProjectIds(userId)
  if (accessibleProjectIds.size === 0) return { projects: [], tasks: [] }
  const projectIdList = Array.from(accessibleProjectIds)

  const indexProjects = await db.query.projects.findMany({
    where: inArray(projects.id, projectIdList),
    columns: { id: true, name: true, description: true },
    orderBy: [asc(projects.name)],
  })

  const accessibleLists = await db.query.lists.findMany({
    where: inArray(lists.projectId, projectIdList),
    columns: { id: true, name: true, projectId: true },
  })
  const listIds = accessibleLists.map((l) => l.id)
  const listById = new Map(accessibleLists.map((l) => [l.id, l]))

  const indexTasks =
    listIds.length === 0
      ? []
      : await db.query.tasks.findMany({
          where: inArray(tasks.listId, listIds),
          columns: { id: true, title: true, listId: true, priority: true },
          orderBy: [desc(tasks.updatedAt)],
          limit: taskLimit,
        })

  return {
    projects: indexProjects,
    tasks: indexTasks.map((t) => {
      const list = listById.get(t.listId)
      return {
        id: t.id,
        title: t.title,
        priority: t.priority,
        listName: list?.name ?? "",
        projectId: list?.projectId ?? "",
      }
    }),
  }
}

/**
 * Search projects (by name/description) and tasks (by title) for the
 * command palette. Scoped the same way the rest of the app scopes
 * visibility: owned projects plus projects the user is a member of, via
 * `getAccessibleProjectIds`. Two extra round trips (accessible project ids,
 * then accessible list ids) — same tradeoff `getProjectsForUser` already
 * makes elsewhere in this file, favoring simple queries over one clever
 * join for a feature that isn't hot-path.
 *
 * Superseded as the palette's primary search by `getSearchIndexForUser`
 * (see `search-index-store.ts`), which avoids a DB round trip per
 * keystroke. Left in place as a fallback path for accounts with more
 * projects/tasks than the index cares to cache client-side.
 */
export async function globalSearchForUser(userId: string, query: string, limit = 6) {
  const trimmed = query.trim()
  if (!trimmed) return { projects: [], tasks: [] }

  const accessibleProjectIds = await getAccessibleProjectIds(userId)
  if (accessibleProjectIds.size === 0) return { projects: [], tasks: [] }
  const projectIdList = Array.from(accessibleProjectIds)
  const pattern = `%${trimmed}%`

  const matchedProjects = await db.query.projects.findMany({
    where: and(
      inArray(projects.id, projectIdList),
      or(ilike(projects.name, pattern), ilike(projects.description, pattern))
    ),
    columns: { id: true, name: true, description: true },
    orderBy: [asc(projects.name)],
    limit,
  })

  const accessibleLists = await db.query.lists.findMany({
    where: inArray(lists.projectId, projectIdList),
    columns: { id: true, name: true, projectId: true },
  })
  const listIds = accessibleLists.map((l) => l.id)
  const listById = new Map(accessibleLists.map((l) => [l.id, l]))

  const matchedTasks =
    listIds.length === 0
      ? []
      : await db.query.tasks.findMany({
          where: and(inArray(tasks.listId, listIds), ilike(tasks.title, pattern)),
          columns: { id: true, title: true, listId: true, priority: true },
          orderBy: [desc(tasks.updatedAt)],
          limit,
        })

  return {
    projects: matchedProjects,
    tasks: matchedTasks.map((t) => {
      const list = listById.get(t.listId)
      return {
        id: t.id,
        title: t.title,
        priority: t.priority,
        listName: list?.name ?? "",
        projectId: list?.projectId ?? "",
      }
    }),
  }
}

export async function getTasksForAssigneeCalendar(userId: string) {
  return db.query.tasks.findMany({
    where: and(eq(tasks.assigneeId, userId), isNotNull(tasks.dueDate)),
    orderBy: [asc(tasks.dueDate)],
    with: {
      list: {
        columns: { id: true, name: true },
        with: {
          project: { columns: { id: true, name: true } },
        },
      },
    },
  })
}

/**
 * Due-dated projects `userId` can see on the calendar: ones they own, plus
 * ones they're a member on. Mirrors the owner-or-member access rule used by
 * `getProjectsForUser` / `canAccessProject`.
 */
export async function getProjectsForCalendar(userId: string) {
  const memberships = await db.query.projectMembers.findMany({
    where: eq(projectMembers.userId, userId),
    columns: { projectId: true },
  })
  const memberProjectIds = memberships.map((m) => m.projectId)

  return db.query.projects.findMany({
    where: and(
      isNotNull(projects.dueDate),
      memberProjectIds.length > 0
        ? or(eq(projects.ownerId, userId), inArray(projects.id, memberProjectIds))
        : eq(projects.ownerId, userId)
    ),
    orderBy: [asc(projects.dueDate)],
    columns: { id: true, name: true, dueDate: true },
  })
}