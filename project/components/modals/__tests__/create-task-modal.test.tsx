import type { ComponentProps } from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CreateTaskModal } from "@/components/modals/create-task-modal"
import type { ListWithTasks } from "@/stores/board-store"
import type { Task } from "@/lib/db/schema"

// taskcomments/taskactivity aren't part of this component's own contract -
// stub them so this file tests createtaskmodal's own logic (tabs, form,
// labels) rather than re-testing components that deserve their own files.
vi.mock("@/components/task-comments", () => ({
  TaskComments: ({ comments }: { comments: unknown[] }) => (
    <div data-testid="task-comments">{comments.length} comments</div>
  ),
}))
vi.mock("@/components/task-activity", () => ({
  TaskActivity: ({ activities }: { activities: unknown[] }) => (
    <div data-testid="task-activity">{activities.length} activities</div>
  ),
}))

const lists: ListWithTasks[] = [
  { id: "list-1", name: "To Do", tasks: [] } as unknown as ListWithTasks,
  { id: "list-2", name: "Doing", tasks: [] } as unknown as ListWithTasks,
]

function baseProps(overrides: Partial<ComponentProps<typeof CreateTaskModal>> = {}) {
  return {
    lists,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    createAnother: false,
    onCreateAnotherChange: vi.fn(),
    ...overrides,
  }
}

describe("CreateTaskModal - create mode", () => {
  it("disables submit until a title is entered, then enables it", async () => {
    const user = userEvent.setup()
    render(<CreateTaskModal {...baseProps()} />)

    expect(screen.getByRole("button", { name: /create task/i })).toBeDisabled()

    await user.type(screen.getByLabelText(/title/i), "Write onboarding docs")
    expect(screen.getByRole("button", { name: /create task/i })).toBeEnabled()
  })

  it("does not submit on empty title even if the form is force-submitted", async () => {
    const onSubmit = vi.fn()
    render(<CreateTaskModal {...baseProps({ onSubmit })} />)
    // whitespace-only title should also be rejected (trimmed check)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/title/i), "   ")
    expect(screen.getByRole("button", { name: /create task/i })).toBeDisabled()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("submits with trimmed title, defaulted priority, null dueDate/assignee, and empty labelIds", async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<CreateTaskModal {...baseProps({ onSubmit })} />)

    await user.type(screen.getByLabelText(/title/i), "  Ship the release  ")
    await user.click(screen.getByRole("button", { name: /create task/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Ship the release",
      description: undefined,
      listId: "list-1", // defaults to lists[0].id
      priority: "medium",
      dueDate: null,
      assigneeId: null,
      labelIds: [],
    })
  })

  it("includes the selected column, priority, due date, and assignee in the submitted payload", async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(
      <CreateTaskModal
        {...baseProps({ onSubmit, members: [{ id: "user-1", name: "Ada" }] })}
      />
    )

    await user.type(screen.getByLabelText(/title/i), "Investigate flaky test")
    await user.selectOptions(screen.getByLabelText(/column/i), "list-2")
    await user.selectOptions(screen.getByLabelText(/priority/i), "high")
    await user.type(screen.getByLabelText(/due date/i), "2026-09-01")
    await user.selectOptions(screen.getByLabelText(/assignee/i), "user-1")
    await user.click(screen.getByRole("button", { name: /create task/i }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        listId: "list-2",
        priority: "high",
        assigneeId: "user-1",
      })
    )
    const payload = onSubmit.mock.calls[0][0]
    expect(payload.dueDate).toBeInstanceOf(Date)
  })

  it("shows the 'create another' checkbox only in create mode and reports changes", async () => {
    const onCreateAnotherChange = vi.fn()
    const user = userEvent.setup()
    render(<CreateTaskModal {...baseProps({ onCreateAnotherChange })} />)

    const checkbox = screen.getByRole("checkbox", { name: /create another task/i })
    await user.click(checkbox)
    expect(onCreateAnotherChange).toHaveBeenCalledWith(true)
  })

  it("calls onClose when the close button is clicked", async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<CreateTaskModal {...baseProps({ onClose })} />)
    await user.click(screen.getByRole("button", { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe("CreateTaskModal - labels", () => {
  const projectLabels = [
    { id: "label-1", name: "Bug", color: "#ff0000" },
    { id: "label-2", name: "Docs", color: "#00ff00" },
  ]

  it("toggles a label on click and includes it in the submitted labelIds", async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<CreateTaskModal {...baseProps({ onSubmit, labels: projectLabels })} />)

    await user.type(screen.getByLabelText(/title/i), "Fix crash")
    await user.click(screen.getByRole("button", { name: "Bug" }))
    await user.click(screen.getByRole("button", { name: /create task/i }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ labelIds: ["label-1"] })
    )
  })

  it("only shows 'New label' to project owners with a create handler", () => {
    const { rerender } = render(
      <CreateTaskModal {...baseProps({ labels: projectLabels, isOwner: false })} />
    )
    expect(screen.queryByRole("button", { name: /new label/i })).not.toBeInTheDocument()

    rerender(
      <CreateTaskModal
        {...baseProps({ labels: projectLabels, isOwner: true, onCreateLabel: vi.fn() })}
      />
    )
    expect(screen.getByRole("button", { name: /new label/i })).toBeInTheDocument()
  })

  it("submits a new label name+color and hides the inline form afterward", async () => {
    const onCreateLabel = vi.fn()
    const user = userEvent.setup()
    render(
      <CreateTaskModal
        {...baseProps({ labels: projectLabels, isOwner: true, onCreateLabel })}
      />
    )

    await user.click(screen.getByRole("button", { name: /new label/i }))
    await user.type(screen.getByPlaceholderText(/label name/i), "Urgent")
    await user.click(screen.getByRole("button", { name: /^add$/i }))

    expect(onCreateLabel).toHaveBeenCalledWith({ name: "Urgent", color: "#8B5CF6" })
    expect(screen.queryByPlaceholderText(/label name/i)).not.toBeInTheDocument()
  })

  it("does not call onCreateLabel with a blank name", async () => {
    const onCreateLabel = vi.fn()
    const user = userEvent.setup()
    render(
      <CreateTaskModal
        {...baseProps({ labels: projectLabels, isOwner: true, onCreateLabel })}
      />
    )
    await user.click(screen.getByRole("button", { name: /new label/i }))
    expect(screen.getByRole("button", { name: /^add$/i })).toBeDisabled()
    expect(onCreateLabel).not.toHaveBeenCalled()
  })
})

describe("CreateTaskModal - edit mode", () => {
  const existingTask = {
    id: "task-1",
    title: "Existing task",
    description: "Some detail",
    listId: "list-1",
    assigneeId: null,
    priority: "low",
    dueDate: null,
    position: 0,
  } as unknown as Task

  it("pre-fills fields from the task", () => {
    render(<CreateTaskModal {...baseProps({ task: existingTask })} />)
    expect(screen.getByLabelText(/title/i)).toHaveValue("Existing task")
    expect(screen.getByLabelText(/description/i)).toHaveValue("Some detail")
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument()
  })

  it("omits listId from the payload when the column is left unchanged", async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<CreateTaskModal {...baseProps({ task: existingTask, onSubmit })} />)
    await user.click(screen.getByRole("button", { name: /save changes/i }))
    expect(onSubmit.mock.calls[0][0].listId).toBeUndefined()
  })

  it("includes the new listId in the payload when the column changes (signals a move)", async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<CreateTaskModal {...baseProps({ task: existingTask, onSubmit })} />)
    await user.selectOptions(screen.getByLabelText(/column/i), "list-2")
    await user.click(screen.getByRole("button", { name: /save changes/i }))
    expect(onSubmit.mock.calls[0][0].listId).toBe("list-2")
  })

  it("shows a delete button and calls onDelete when clicked", async () => {
    const onDelete = vi.fn()
    const user = userEvent.setup()
    render(<CreateTaskModal {...baseProps({ task: existingTask, onDelete })} />)
    await user.click(screen.getByRole("button", { name: /delete task/i }))
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it("hides the 'create another' checkbox in edit mode", () => {
    render(<CreateTaskModal {...baseProps({ task: existingTask })} />)
    expect(
      screen.queryByRole("checkbox", { name: /create another task/i })
    ).not.toBeInTheDocument()
  })

  it("shows Comments and Activity tabs only when their data is provided, and switches between them", async () => {
    const user = userEvent.setup()
    render(
      <CreateTaskModal
        {...baseProps({
          task: existingTask,
          comments: [{ id: "c1" } as never],
          activities: [{ id: "a1" } as never, { id: "a2" } as never],
          currentUserId: "user-1",
        })}
      />
    )

    expect(screen.getByRole("button", { name: /comments \(1\)/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^activity$/i })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /^activity$/i }))
    expect(screen.getByTestId("task-activity")).toHaveTextContent("2 activities")
  })

  it("does not render a Comments tab when comments/currentUserId are omitted", () => {
    render(<CreateTaskModal {...baseProps({ task: existingTask })} />)
    expect(screen.queryByRole("button", { name: /comments/i })).not.toBeInTheDocument()
  })
})
