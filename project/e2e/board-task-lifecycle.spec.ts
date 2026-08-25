import { test, expect } from "@playwright/test"
import { setupClerkTestingToken } from "@clerk/testing/playwright"

// these specs assume a project already exists for the e2e test user and
// that its first project has at least two columns (e.g. "to do", "doing")
// seeded by a test-database fixture - see readme note below the file for
// the seeding approach. adjust the `project_name` / column names to match
// your actual seed data.
const PROJECT_NAME = "E2E Test Project"

async function ensureColumns(page: import("@playwright/test").Page, count: number) {
  while ((await page.getByRole("button", { name: /add task/i }).count()) < count) {
    await page.getByRole("button", { name: "Add column" }).click()
    await page.getByPlaceholder("Column name").fill(`E2E Column ${Date.now()}`)
    await page.getByRole("button", { name: "Add column" }).click()
  }
}

test.beforeEach(async ({ page }) => {
  await setupClerkTestingToken({ page })
  await page.goto("/dashboard")
  await page.getByRole("link", { name: PROJECT_NAME }).first().click()
  await page.waitForURL(/\/projects\//)
  await ensureColumns(page, 2)
})

test.describe("Task lifecycle", () => {
  test("create a task, verify it appears in its column", async ({ page }) => {
    const title = `Write the report ${Date.now()}`

    await page.getByRole("button", { name: /add task/i }).first().click()
    await page.getByLabel(/title/i).fill(title)
    await page.getByRole("button", { name: /create task/i }).click()

    await expect(page.getByText(title)).toBeVisible()
  })

  test("edit an existing task's title and priority", async ({ page }) => {
    const title = `Editable task ${Date.now()}`
    await page.getByRole("button", { name: /add task/i }).first().click()
    await page.getByLabel(/title/i).fill(title)
    await page.getByRole("button", { name: /create task/i }).click()
    await expect(page.getByText(title)).toBeVisible()

    await page.getByText(title).click()
    const newTitle = `${title} (edited)`
    await page.getByLabel(/title/i).fill(newTitle)
    await page.getByLabel(/priority/i).selectOption("high")
    await page.getByRole("button", { name: /save changes/i }).click()

    await expect(page.getByText(newTitle)).toBeVisible()
  })

  test("delete a task with confirmation", async ({ page }) => {
    const title = `Deletable task ${Date.now()}`
    await page.getByRole("button", { name: /add task/i }).first().click()
    await page.getByLabel(/title/i).fill(title)
    await page.getByRole("button", { name: /create task/i }).click()
    await expect(page.getByText(title)).toBeVisible()

    page.once("dialog", (dialog) => dialog.accept())
    await page.getByText(title).click()
    await page.getByRole("button", { name: /Delete task/i }).click()

    await expect(page.getByText(title)).not.toBeVisible()
  })

  test("'create another' keeps the modal open for consecutive task entry", async ({ page }) => {
    await page.getByRole("button", { name: /add task/i }).first().click()
    await page.getByText("Create another task after this one", { exact: true }).click()

    const first = `Batch task 1 ${Date.now()}`
    await page.getByLabel(/title/i).fill(first)
    await page.getByRole("button", { name: /create.*another/i }).click()

    // modal re-opens blank, still in create mode
    await expect(page.getByLabel(/title/i)).toHaveValue("")
    const second = `Batch task 2 ${Date.now()}`
    await page.getByLabel(/title/i).fill(second)
    await page.getByRole("button", { name: /create.*another/i }).click()

    await expect(page.getByText(first)).toBeVisible()
    await expect(page.getByText(second)).toBeVisible()
  })

  test("drag a task from one column to another and it persists after reload", async ({ page }) => {
    await ensureColumns(page, 3)
    const title = `Draggable task ${Date.now()}`
    const addTaskButtons = page.getByRole("button", { name: /add task/i })
    await addTaskButtons.first().click()
    await page.getByLabel(/title/i).fill(title)
    await page.getByRole("button", { name: /create task/i }).click()

    const card = page.getByText(title)
    const destination = addTaskButtons.nth(2).locator("xpath=../..")

    await card.hover()
    await page.mouse.down()
    await destination.hover()
    await page.mouse.move(0, 0, { steps: 5 }) // nudge to trigger dnd-kit's distance-based activation
    await destination.hover()
    await page.mouse.up()

    await expect(destination.getByText(title)).toBeVisible()

    await page.reload()
    await expect(
      page.getByRole("button", { name: /add task/i }).nth(2).locator("xpath=../..").getByText(title)
    ).toBeVisible()
  })

  test("adding a comment shows it in the Comments tab with an updated count", async ({ page }) => {
    const title = `Commentable task ${Date.now()}`
    await page.getByRole("button", { name: /add task/i }).first().click()
    await page.getByLabel(/title/i).fill(title)
    await page.getByRole("button", { name: /create task/i }).click()
    await expect(page.getByText(title)).toBeVisible()
    await page.getByText(title).click()

    await page.getByRole("button", { name: /comments/i }).click()
    const commentText = `Looks good to me - ${Date.now()}`
    await page.getByPlaceholder(/write a comment/i).fill(commentText)
    await page.getByRole("button", { name: "Post" }).click()

    await expect(page.getByText(commentText)).toBeVisible()
    await expect(page.getByRole("button", { name: /comments \(1\)/i })).toBeVisible()
  })
})

test.describe("Bulk operations", () => {
  test("multi-select via keyboard shortcut and bulk delete", async ({ page }) => {
    const titles = [`Bulk A ${Date.now()}`, `Bulk B ${Date.now()}`]
    for (const t of titles) {
      await page.getByRole("button", { name: /add task/i }).first().click()
      await page.getByLabel(/title/i).fill(t)
      await page.getByRole("button", { name: /create task/i }).click()
      await expect(page.getByText(t)).toBeVisible()
    }

    // click board background to ensure focus isn't in a text field, then
    // select-all per kanban-board.tsx's keyboard shortcut handling
    await page.locator("body").click({ position: { x: 5, y: 5 } })
    await page.keyboard.press("Control+a")

    page.once("dialog", (dialog) => dialog.accept())
    await page.keyboard.press("Delete")

    for (const t of titles) {
      await expect(page.getByText(t)).not.toBeVisible()
    }
  })
})
