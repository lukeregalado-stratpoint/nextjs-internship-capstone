import { test, expect } from "@playwright/test"
import { setupClerkTestingToken } from "@clerk/testing/playwright"

test.beforeEach(async ({ page }) => {
  await setupClerkTestingToken({ page })
})

async function ensureColumn(page: import("@playwright/test").Page) {
  if ((await page.getByRole("button", { name: /add task/i }).count()) > 0) return
  await page.getByRole("button", { name: "Add column" }).click()
  await page.getByPlaceholder("Column name").fill(`E2E Column ${Date.now()}`)
  await page.getByRole("button", { name: "Add column" }).click()
  await expect(page.getByRole("button", { name: /add task/i }).first()).toBeVisible()
}

test.describe("Project creation", () => {
  test("create a new project from the dashboard and land on its board", async ({ page }) => {
    await page.goto("/dashboard")
    const name = `E2E Project ${Date.now()}`

    await page.getByRole("button", { name: /new project|create project/i }).click()
    await page.getByLabel(/name/i).fill(name)
    await page.getByRole("button", { name: /^create project$/i }).click()

    await expect(page).toHaveURL(/\/projects\//)
    await expect(page.getByRole("heading", { name })).toBeVisible()
  })

  test("a newly created project starts with no tasks", async ({ page }) => {
    await page.goto("/dashboard")
    const name = `Empty Project ${Date.now()}`
    await page.getByRole("button", { name: /new project|create project/i }).click()
    await page.getByLabel(/name/i).fill(name)
    await page.getByRole("button", { name: /^create project$/i }).click()

    await expect(page).toHaveURL(/\/projects\//)
    await expect(page.getByText("0 tasks")).toBeVisible()
  })
})

test.describe("Project members", () => {
  test("owner can open member management and see themselves listed", async ({ page }) => {
    await page.goto("/dashboard")
    await page.getByRole("link", { name: /e2e test project/i }).first().click()
    await page.getByRole("button", { name: /manage/i }).click()

    await expect(page.getByRole("heading", { name: "Manage members" })).toBeVisible()
    // the e2e test user is the project owner in the seeded fixture
    await expect(page.getByText("Owner", { exact: true }).last()).toBeVisible()
  })
})

test.describe("Search", () => {
  test("filtering the board hides non-matching tasks and shows a match count", async ({ page }) => {
    await page.goto("/dashboard")
    await page.getByRole("link", { name: /e2e test project/i }).first().click()
    await ensureColumn(page)

    const uniqueTitle = `Findable ${Date.now()}`
    await page.getByRole("button", { name: /add task/i }).first().click()
    await page.getByLabel(/title/i).fill(uniqueTitle)
    await page.getByRole("button", { name: /create task/i }).click()

    await page.getByPlaceholder(/search/i).fill(uniqueTitle)
    await expect(page.getByText(uniqueTitle)).toBeVisible()
    await expect(page.getByText(/1 of \d+|1 match/i)).toBeVisible()

    await page.getByPlaceholder(/search/i).fill("zzz-no-such-task-zzz")
    await expect(page.getByText(/no matching tasks/i).first()).toBeVisible()
  })
})
