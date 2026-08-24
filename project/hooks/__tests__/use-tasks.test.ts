import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import type { createTestBoardStore } from "../../test/mocks/board-store"

// vi.mock factories that need real setup logic can be async and use a
// dynamic import — this sidesteps the hoisting trap where a plain
// top-level `const` referenced inside a (hoisted) vi.mock factory would be
// accessed before it's initialized. zustand's create() attaches
// getState/setState/subscribe directly onto the returned store function,
// so Object.assign-ing it onto useBoardStore below means the mocked
// export itself doubles as the plain store handle used in tests.
vi.mock("@/stores/board-store", async () => {
  const { createTestBoardStore } = await import("../../test/mocks/board-store")
  const testStore = createTestBoardStore()
  return {
    useBoardStore: Object.assign(
      (selector: (s: unknown) => unknown) => selector(testStore.getState()),
      testStore
    ),
  }
})

vi.mock("@/lib/actions/tasks", () => ({
  createTaskAction: vi.fn(),
  updateTaskAction: vi.fn(),
  deleteTaskAction: vi.fn(),
  moveTaskAction: vi.fn(),
  bulkDeleteTasksAction: vi.fn(),
  bulkUpdateTasksAction: vi.fn(),
}))

import * as actions from "@/lib/actions/tasks"
import { useBoardStore } from "@/stores/board-store"
import { useTasks } from "@/hooks/use-tasks"

// Typed handle onto the mocked store — same object identity as the
// `testStore` created inside the vi.mock factory above.
const store = useBoardStore as unknown as ReturnType<typeof createTestBoardStore>


const PROJECT_ID = "project-1"

function seedList() {
  store.setState({
    lists: [
      {
        id: "list-1",
        name: "To Do",
        tasks: [{ id: "task-1", title: "Existing", listId: "list-1", labels: [] } as never],
      },
    ],
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  store.setState({
    lists: [],
    pendingTaskIds: new Set(),
    selectedTaskIds: new Set(),
  })
})

describe("useTasks — createTask", () => {
  it("adds the returned task to the store on success", async () => {
    seedList()
    vi.mocked(actions.createTaskAction).mockResolvedValue({
      success: true,
      data: { id: "task-2", title: "New", listId: "list-1", labels: [] } as never,
    })
    const { result } = renderHook(() => useTasks(PROJECT_ID))
    const onSuccess = vi.fn()

    act(() => {
      result.current.createTask({ title: "New", listId: "list-1" } as never, onSuccess)
    })

    await waitFor(() => {
      expect(store.getState().lists[0].tasks).toHaveLength(2)
    })
    expect(onSuccess).toHaveBeenCalled()
    expect(result.current.error).toBeNull()
  })

  it("surfaces the error and leaves the store untouched on failure", async () => {
    seedList()
    vi.mocked(actions.createTaskAction).mockResolvedValue({
      success: false,
      error: "You don't have permission to add tasks to this column",
    })
    const { result } = renderHook(() => useTasks(PROJECT_ID))

    act(() => {
      result.current.createTask({ title: "New", listId: "list-1" } as never)
    })

    await waitFor(() => expect(result.current.error).toBe(
      "You don't have permission to add tasks to this column"
    ))
    expect(store.getState().lists[0].tasks).toHaveLength(1)
  })
})

describe("useTasks — updateTask (optimistic)", () => {
  it("applies the change immediately, then confirms with server data", async () => {
    seedList()
    vi.mocked(actions.updateTaskAction).mockResolvedValue({
      success: true,
      data: { id: "task-1", title: "Renamed", listId: "list-1", labels: [] } as never,
    })
    const { result } = renderHook(() => useTasks(PROJECT_ID))

    act(() => {
      result.current.updateTask("task-1", { title: "Renamed" } as never)
    })

    // optimistic: applied synchronously, before the mocked action resolves
    expect(store.getState().lists[0].tasks[0].title).toBe("Renamed")
    expect(store.getState().pendingTaskIds.has("task-1")).toBe(true)

    await waitFor(() => expect(store.getState().pendingTaskIds.has("task-1")).toBe(false))
  })

  it("rolls back to the pre-update snapshot when the server rejects the change", async () => {
    seedList()
    vi.mocked(actions.updateTaskAction).mockResolvedValue({
      success: false,
      error: "You don't have permission to edit this task",
    })
    const { result } = renderHook(() => useTasks(PROJECT_ID))

    act(() => {
      result.current.updateTask("task-1", { title: "Renamed" } as never)
    })
    expect(store.getState().lists[0].tasks[0].title).toBe("Renamed") // optimistic

    await waitFor(() => expect(result.current.error).toBe(
      "You don't have permission to edit this task"
    ))
    expect(store.getState().lists[0].tasks[0].title).toBe("Existing") // rolled back
    expect(store.getState().pendingTaskIds.has("task-1")).toBe(false)
  })
})

describe("useTasks — deleteTask (optimistic)", () => {
  it("removes the task immediately and does not restore it on success", async () => {
    seedList()
    vi.mocked(actions.deleteTaskAction).mockResolvedValue({
      success: true,
      data: { id: "task-1" },
    })
    const { result } = renderHook(() => useTasks(PROJECT_ID))
    const onSuccess = vi.fn()

    act(() => {
      result.current.deleteTask("task-1", onSuccess)
    })
    expect(store.getState().lists[0].tasks).toHaveLength(0)

    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(store.getState().lists[0].tasks).toHaveLength(0)
  })

  it("restores the task if deletion fails on the server", async () => {
    seedList()
    vi.mocked(actions.deleteTaskAction).mockResolvedValue({
      success: false,
      error: "You don't have permission to delete this task",
    })
    const { result } = renderHook(() => useTasks(PROJECT_ID))

    act(() => {
      result.current.deleteTask("task-1")
    })
    expect(store.getState().lists[0].tasks).toHaveLength(0) // optimistic removal

    await waitFor(() => expect(store.getState().lists[0].tasks).toHaveLength(1))
    expect(store.getState().lists[0].tasks[0].id).toBe("task-1")
  })
})

describe("useTasks — bulk operations", () => {
  it("bulkDeleteTasks removes all selected tasks optimistically and confirms on success", async () => {
    store.setState({
      lists: [
        {
          id: "list-1",
          name: "To Do",
          tasks: [
            { id: "task-1", title: "A", listId: "list-1", labels: [] },
            { id: "task-2", title: "B", listId: "list-1", labels: [] },
          ] as never,
        },
      ],
    })
    vi.mocked(actions.bulkDeleteTasksAction).mockResolvedValue({
      success: true,
      data: { ids: ["task-1", "task-2"] },
    })
    const { result } = renderHook(() => useTasks(PROJECT_ID))
    const onSuccess = vi.fn()

    act(() => {
      result.current.bulkDeleteTasks(["task-1", "task-2"], onSuccess)
    })
    expect(store.getState().lists[0].tasks).toHaveLength(0)
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })

  it("bulkUpdateTasks rolls back every affected task on failure", async () => {
    store.setState({
      lists: [
        {
          id: "list-1",
          name: "To Do",
          tasks: [
            { id: "task-1", title: "A", listId: "list-1", priority: "low", labels: [] },
            { id: "task-2", title: "B", listId: "list-1", priority: "low", labels: [] },
          ] as never,
        },
      ],
    })
    vi.mocked(actions.bulkUpdateTasksAction).mockResolvedValue({
      success: false,
      error: "You don't have permission to edit one or more of these tasks",
    })
    const { result } = renderHook(() => useTasks(PROJECT_ID))

    act(() => {
      result.current.bulkUpdateTasks(["task-1", "task-2"], { priority: "high" })
    })

    await waitFor(() => expect(result.current.error).toMatch(/permission/i))
    expect(store.getState().lists[0].tasks.every((t) => t.priority === "low")).toBe(true)
  })
})
