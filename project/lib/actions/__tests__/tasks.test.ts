import { describe, it, expect, vi, beforeEach } from "vitest"

// --- Mocks for everything tasks.ts talks to ---------------------------
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(),
}))

vi.mock("@/lib/notifications", () => ({
  notifyUser: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/db/queries", () => ({
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  moveTask: vi.fn(),
  bulkDeleteTasks: vi.fn(),
  bulkUpdateTasks: vi.fn(),
  ownsList: vi.fn(),
  ownsTask: vi.fn(),
  ownsTasks: vi.fn(),
  getAssignableUserIds: vi.fn(),
  getLabelsForTask: vi.fn(),
  getListById: vi.fn(),
  getNextTaskPosition: vi.fn(),
  getProjectLabelIds: vi.fn(),
  getTaskById: vi.fn(),
  logActivity: vi.fn().mockResolvedValue(undefined),
  setTaskLabels: vi.fn().mockResolvedValue(undefined),
}))

// Real zod schemas aren't available in this context — a permissive mock
// keeps these tests focused on tasks.ts's own branching (permissions,
// diffing, activity logs) rather than re-verifying zod. Validation-schema
// behavior itself belongs in lib/validations.test.ts against the real file.
vi.mock("@/lib/validations", () => ({
  taskSchema: { safeParse: vi.fn((input) => ({ success: true, data: input })) },
  taskUpdateSchema: { safeParse: vi.fn((input) => ({ success: true, data: input })) },
  taskMoveSchema: { safeParse: vi.fn((input) => ({ success: true, data: input })) },
  taskBulkDeleteSchema: { safeParse: vi.fn((input) => ({ success: true, data: input })) },
  taskBulkUpdateSchema: { safeParse: vi.fn((input) => ({ success: true, data: input })) },
}))

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { notifyUser } from "@/lib/notifications"
import * as queries from "@/lib/db/queries"
import * as validations from "@/lib/validations"
import {
  createTaskAction,
  updateTaskAction,
  deleteTaskAction,
  moveTaskAction,
  bulkDeleteTasksAction,
  bulkUpdateTasksAction,
} from "@/lib/actions/tasks"

const USER = { id: "user-1", email: "a@b.com", name: "Ada", clerkId: "clerk_1" }
const PROJECT_ID = "project-1"

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireUser).mockResolvedValue(USER as never)
})

describe("createTaskAction", () => {
  const input = {
    title: "New task",
    listId: "list-1",
    priority: "medium",
    dueDate: null,
    assigneeId: null,
    labelIds: [],
  }

  it("rejects when the caller doesn't own the destination list", async () => {
    vi.mocked(queries.ownsList).mockResolvedValue(false)
    const result = await createTaskAction(PROJECT_ID, input)
    expect(result).toEqual({
      success: false,
      error: "You don't have permission to add tasks to this column",
    })
    expect(queries.createTask).not.toHaveBeenCalled()
  })

  it("rejects an assignee who isn't a project member", async () => {
    vi.mocked(queries.ownsList).mockResolvedValue(true)
    vi.mocked(queries.getAssignableUserIds).mockResolvedValue(["other-user"])
    const result = await createTaskAction(PROJECT_ID, { ...input, assigneeId: "not-a-member" })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/assignee must be a member/i)
  })

  it("rejects labels that don't belong to the project", async () => {
    vi.mocked(queries.ownsList).mockResolvedValue(true)
    vi.mocked(queries.getProjectLabelIds).mockResolvedValue(["label-a"])
    const result = await createTaskAction(PROJECT_ID, { ...input, labelIds: ["label-x"] })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/labels must belong/i)
  })

  it("creates the task, sets labels, logs activity, and revalidates on success", async () => {
    vi.mocked(queries.ownsList).mockResolvedValue(true)
    vi.mocked(queries.getNextTaskPosition).mockResolvedValue(3)
    vi.mocked(queries.createTask).mockResolvedValue({
      id: "task-1",
      title: "New task",
      listId: "list-1",
      assigneeId: null,
    } as never)
    vi.mocked(queries.getLabelsForTask).mockResolvedValue([])

    const result = await createTaskAction(PROJECT_ID, input)

    expect(result.success).toBe(true)
    expect(queries.setTaskLabels).toHaveBeenCalledWith("task-1", [])
    expect(queries.logActivity).toHaveBeenCalledWith(
      "task-1",
      USER.id,
      "task_created",
      expect.objectContaining({ title: "New task" })
    )
    expect(revalidatePath).toHaveBeenCalledWith(`/projects/${PROJECT_ID}`)
    expect(notifyUser).not.toHaveBeenCalled() // no assignee -> no notification
  })

  it("notifies the assignee when the task is created assigned to someone else", async () => {
    vi.mocked(queries.ownsList).mockResolvedValue(true)
    vi.mocked(queries.getAssignableUserIds).mockResolvedValue(["user-2"])
    vi.mocked(queries.getNextTaskPosition).mockResolvedValue(0)
    vi.mocked(queries.createTask).mockResolvedValue({
      id: "task-2",
      title: "Assigned task",
      listId: "list-1",
      assigneeId: "user-2",
    } as never)
    vi.mocked(queries.getLabelsForTask).mockResolvedValue([])

    await createTaskAction(PROJECT_ID, { ...input, assigneeId: "user-2" })

    expect(notifyUser).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: "user-2", type: "task_assigned" })
    )
  })

  it("does not notify when the assignee is the acting user themself", async () => {
    vi.mocked(queries.ownsList).mockResolvedValue(true)
    vi.mocked(queries.getAssignableUserIds).mockResolvedValue([USER.id])
    vi.mocked(queries.getNextTaskPosition).mockResolvedValue(0)
    vi.mocked(queries.createTask).mockResolvedValue({
      id: "task-3",
      title: "Self-assigned",
      listId: "list-1",
      assigneeId: USER.id,
    } as never)
    vi.mocked(queries.getLabelsForTask).mockResolvedValue([])

    await createTaskAction(PROJECT_ID, { ...input, assigneeId: USER.id })
    expect(notifyUser).not.toHaveBeenCalled()
  })

  it("surfaces a validation error without touching the database", async () => {
    vi.mocked(validations.taskSchema.safeParse).mockReturnValueOnce({
      success: false,
      error: { issues: [{ message: "Title is required" }] },
    } as never)
    const result = await createTaskAction(PROJECT_ID, { ...input, title: "" })
    expect(result).toEqual({ success: false, error: "Title is required" })
    expect(queries.ownsList).not.toHaveBeenCalled()
  })
})

describe("updateTaskAction", () => {
  const previous = {
    id: "task-1",
    title: "Old title",
    description: "Old desc",
    listId: "list-1",
    assigneeId: null,
    priority: "low",
    dueDate: null,
    assignee: null,
    list: { name: "To Do" },
  }

  beforeEach(() => {
    vi.mocked(queries.ownsTask).mockResolvedValue(true)
    vi.mocked(queries.getTaskById).mockResolvedValue(previous as never)
    vi.mocked(queries.updateTask).mockImplementation(async (_id, fields) => ({
      ...previous,
      ...fields,
    }) as never)
    vi.mocked(queries.getLabelsForTask).mockResolvedValue([])
  })

  it("rejects when the caller doesn't own the task", async () => {
    vi.mocked(queries.ownsTask).mockResolvedValue(false)
    const result = await updateTaskAction("task-1", PROJECT_ID, { title: "x" })
    expect(result.success).toBe(false)
    expect(queries.updateTask).not.toHaveBeenCalled()
  })

  it("logs a title_changed activity only when the title actually changed", async () => {
    await updateTaskAction("task-1", PROJECT_ID, { title: "New title" })
    expect(queries.logActivity).toHaveBeenCalledWith(
      "task-1",
      USER.id,
      "title_changed",
      { from: "Old title", to: "New title" }
    )
  })

  it("does not log title_changed when the title is resubmitted unchanged", async () => {
    await updateTaskAction("task-1", PROJECT_ID, { title: "Old title" })
    expect(queries.logActivity).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "title_changed",
      expect.anything()
    )
  })

  it("clears dueReminderSentAt when the due date changes", async () => {
    const newDate = new Date("2026-12-01")
    await updateTaskAction("task-1", PROJECT_ID, { dueDate: newDate })
    expect(queries.updateTask).toHaveBeenCalledWith(
      "task-1",
      expect.objectContaining({ dueDate: newDate, dueReminderSentAt: null })
    )
  })

  it("moving to a new list requires owning the destination and logs status_changed", async () => {
    vi.mocked(queries.ownsList).mockResolvedValue(true)
    vi.mocked(queries.getNextTaskPosition).mockResolvedValue(5)
    vi.mocked(queries.getListById).mockResolvedValue({ id: "list-2", name: "Doing" } as never)

    const result = await updateTaskAction("task-1", PROJECT_ID, { listId: "list-2" })

    expect(result.success).toBe(true)
    expect(queries.updateTask).toHaveBeenCalledWith(
      "task-1",
      expect.objectContaining({ listId: "list-2", position: 5 })
    )
    expect(queries.logActivity).toHaveBeenCalledWith(
      "task-1",
      USER.id,
      "status_changed",
      expect.objectContaining({ toId: "list-2", toName: "Doing" })
    )
  })

  it("rejects a move to a list the caller doesn't own", async () => {
    vi.mocked(queries.ownsList).mockResolvedValue(false)
    const result = await updateTaskAction("task-1", PROJECT_ID, { listId: "list-2" })
    expect(result.success).toBe(false)
    expect(queries.updateTask).not.toHaveBeenCalled()
  })

  it("notifies the new assignee only when it changed and isn't the acting user", async () => {
    vi.mocked(queries.getAssignableUserIds).mockResolvedValue(["user-2"])
    await updateTaskAction("task-1", PROJECT_ID, { assigneeId: "user-2" })
    expect(notifyUser).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: "user-2", type: "task_assigned" })
    )
  })

  it("returns 'Task not found' when getTaskById can't find the pre-update snapshot", async () => {
    vi.mocked(queries.getTaskById).mockResolvedValue(null as never)
    const result = await updateTaskAction("task-1", PROJECT_ID, { title: "x" })
    expect(result).toEqual({ success: false, error: "Task not found" })
  })

  it("continues the update even if activity logging throws (non-fatal by design)", async () => {
    vi.mocked(queries.logActivity).mockRejectedValueOnce(new Error("db down"))
    const result = await updateTaskAction("task-1", PROJECT_ID, { title: "New title" })
    expect(result.success).toBe(true)
  })
})

describe("deleteTaskAction", () => {
  it("rejects when the caller doesn't own the task", async () => {
    vi.mocked(queries.ownsTask).mockResolvedValue(false)
    const result = await deleteTaskAction("task-1", PROJECT_ID)
    expect(result.success).toBe(false)
    expect(queries.deleteTask).not.toHaveBeenCalled()
  })

  it("deletes and revalidates on success", async () => {
    vi.mocked(queries.ownsTask).mockResolvedValue(true)
    const result = await deleteTaskAction("task-1", PROJECT_ID)
    expect(result).toEqual({ success: true, data: { id: "task-1" } })
    expect(revalidatePath).toHaveBeenCalledWith(`/projects/${PROJECT_ID}`)
  })
})

describe("moveTaskAction", () => {
  it("requires ownership of both the task and the destination list", async () => {
    vi.mocked(queries.ownsTask).mockResolvedValue(true)
    vi.mocked(queries.ownsList).mockResolvedValue(false)
    const result = await moveTaskAction(PROJECT_ID, {
      taskId: "task-1",
      destListId: "list-2",
      orderedTaskIds: ["task-1"],
    })
    expect(result.success).toBe(false)
    expect(queries.moveTask).not.toHaveBeenCalled()
  })

  it("logs status_changed only when the list actually changes", async () => {
    vi.mocked(queries.ownsTask).mockResolvedValue(true)
    vi.mocked(queries.ownsList).mockResolvedValue(true)
    vi.mocked(queries.getTaskById).mockResolvedValue({
      id: "task-1",
      listId: "list-1",
      list: { name: "To Do" },
    } as never)
    vi.mocked(queries.getListById).mockResolvedValue({ id: "list-2", name: "Doing" } as never)

    await moveTaskAction(PROJECT_ID, {
      taskId: "task-1",
      destListId: "list-2",
      orderedTaskIds: ["task-1"],
    })

    expect(queries.logActivity).toHaveBeenCalledWith(
      "task-1",
      USER.id,
      "status_changed",
      expect.objectContaining({ toId: "list-2" })
    )
  })

  it("does not log an activity for a same-list reorder", async () => {
    vi.mocked(queries.ownsTask).mockResolvedValue(true)
    vi.mocked(queries.ownsList).mockResolvedValue(true)
    vi.mocked(queries.getTaskById).mockResolvedValue({ id: "task-1", listId: "list-1" } as never)

    await moveTaskAction(PROJECT_ID, {
      taskId: "task-1",
      destListId: "list-1",
      orderedTaskIds: ["task-1", "task-2"],
    })

    expect(queries.logActivity).not.toHaveBeenCalled()
  })
})

describe("bulkDeleteTasksAction", () => {
  it("is all-or-nothing: rejects if the caller doesn't own every task", async () => {
    vi.mocked(queries.ownsTasks).mockResolvedValue(false)
    const result = await bulkDeleteTasksAction(["task-1", "task-2"], PROJECT_ID)
    expect(result.success).toBe(false)
    expect(queries.bulkDeleteTasks).not.toHaveBeenCalled()
  })

  it("deletes all tasks and revalidates on success", async () => {
    vi.mocked(queries.ownsTasks).mockResolvedValue(true)
    const result = await bulkDeleteTasksAction(["task-1", "task-2"], PROJECT_ID)
    expect(result).toEqual({ success: true, data: { ids: ["task-1", "task-2"] } })
  })
})

describe("bulkUpdateTasksAction", () => {
  it("rejects a no-op update with nothing to change", async () => {
    vi.mocked(queries.ownsTasks).mockResolvedValue(true)
    const result = await bulkUpdateTasksAction(PROJECT_ID, { taskIds: ["task-1"] })
    expect(result).toEqual({ success: false, error: "Nothing to update" })
  })

  it("rejects moving to a list the caller doesn't own", async () => {
    vi.mocked(queries.ownsTasks).mockResolvedValue(true)
    vi.mocked(queries.ownsList).mockResolvedValue(false)
    const result = await bulkUpdateTasksAction(PROJECT_ID, {
      taskIds: ["task-1"],
      listId: "list-2",
    })
    expect(result.success).toBe(false)
    expect(queries.bulkUpdateTasks).not.toHaveBeenCalled()
  })

  it("rejects assigning to a non-member", async () => {
    vi.mocked(queries.ownsTasks).mockResolvedValue(true)
    vi.mocked(queries.getAssignableUserIds).mockResolvedValue(["someone-else"])
    const result = await bulkUpdateTasksAction(PROJECT_ID, {
      taskIds: ["task-1"],
      assigneeId: "not-a-member",
    })
    expect(result.success).toBe(false)
  })

  it("applies a valid bulk move and logs one status_changed activity per task", async () => {
    vi.mocked(queries.ownsTasks).mockResolvedValue(true)
    vi.mocked(queries.ownsList).mockResolvedValue(true)

    const result = await bulkUpdateTasksAction(PROJECT_ID, {
      taskIds: ["task-1", "task-2"],
      listId: "list-2",
    })

    expect(result.success).toBe(true)
    expect(queries.bulkUpdateTasks).toHaveBeenCalledWith(["task-1", "task-2"], { listId: "list-2" })
    expect(queries.logActivity).toHaveBeenCalledTimes(2)
  })

  it("succeeds even if bulk activity logging throws (non-fatal by design)", async () => {
    vi.mocked(queries.ownsTasks).mockResolvedValue(true)
    vi.mocked(queries.ownsList).mockResolvedValue(true)
    vi.mocked(queries.logActivity).mockRejectedValue(new Error("boom"))

    const result = await bulkUpdateTasksAction(PROJECT_ID, {
      taskIds: ["task-1"],
      listId: "list-2",
    })
    expect(result.success).toBe(true)
  })
})
