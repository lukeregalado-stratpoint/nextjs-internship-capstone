# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: board-task-lifecycle.spec.ts >> Task lifecycle >> 'create another' keeps the modal open for consecutive task entry
- Location: e2e\board-task-lifecycle.spec.ts:68:7

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator: getByLabel(/title/i)
Expected: ""
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toHaveValue" with timeout 15000ms
  - waiting for getByLabel(/title/i)
    8 × locator resolved to <input required="" id="task-title" maxlength="200" value="Batch task 1 1787565399958" placeholder="e.g. Design the onboarding flow" class="w-full px-3 py-2 border border-input rounded-xl bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"/>
      - unexpected value "Batch task 1 1787565399958"

```

```yaml
- button "Collapse sidebar":
  - img
- link "WIP":
  - /url: /
- button "Search ⌘K":
  - img
  - text: Search ⌘K
- navigation:
  - list:
    - listitem:
      - link "Dashboard":
        - /url: /dashboard
        - img
        - text: Dashboard
    - listitem:
      - link "Projects":
        - /url: /projects
        - img
        - text: Projects
    - listitem:
      - link "Team":
        - /url: /team
        - img
        - text: Team
    - listitem:
      - link "Analytics":
        - /url: /analytics
        - img
        - text: Analytics
    - listitem:
      - link "Calendar":
        - /url: /calendar
        - img
        - text: Calendar
    - listitem:
      - link "Settings":
        - /url: /settings
        - img
        - text: Settings
- button "Open user menu":
  - img "e2e test's logo"
- button "Notifications":
  - img
- button "Toggle theme":
  - img
- main:
  - heading "Dashboard" [level=1]
  - paragraph: Welcome back, e2e test! Here's an overview of your projects and tasks.
  - img
  - paragraph: Active projects
  - paragraph: "57"
  - img
  - paragraph: Completed tasks
  - paragraph: "0"
  - img
  - paragraph: In progress
  - paragraph: "2"
  - img
  - paragraph: Backlog
  - paragraph: "18"
  - heading "Recent projects" [level=3]
  - button "New Project":
    - img
    - text: New Project
  - link "E2E Test Project":
    - /url: /projects/1ac86635-e5ce-401a-ba8c-fac7f8ca0c49
  - button "New Task":
    - img
    - text: New Task
  - link "Empty Project 1787564211192":
    - /url: /projects/312ba2cd-23fe-4b00-a111-599de47e2503
  - button "New Task":
    - img
    - text: New Task
  - link "E2E Project 1787564207047":
    - /url: /projects/a2c56a7f-a275-4115-8b0b-95534d928266
  - button "New Task":
    - img
    - text: New Task
- alert
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test"
  2   | import { setupClerkTestingToken } from "@clerk/testing/playwright"
  3   | 
  4   | // These specs assume a project already exists for the E2E test user and
  5   | // that its first project has at least two columns (e.g. "To Do", "Doing")
  6   | // seeded by a test-database fixture — see README note below the file for
  7   | // the seeding approach. Adjust the `PROJECT_NAME` / column names to match
  8   | // your actual seed data.
  9   | const PROJECT_NAME = "E2E Test Project"
  10  | 
  11  | async function ensureColumns(page: import("@playwright/test").Page, count: number) {
  12  |   while ((await page.getByRole("button", { name: /add task/i }).count()) < count) {
  13  |     await page.getByRole("button", { name: "Add column" }).click()
  14  |     await page.getByPlaceholder("Column name").fill(`E2E Column ${Date.now()}`)
  15  |     await page.getByRole("button", { name: "Add column" }).click()
  16  |   }
  17  | }
  18  | 
  19  | test.beforeEach(async ({ page }) => {
  20  |   await setupClerkTestingToken({ page })
  21  |   await page.goto("/dashboard")
  22  |   await page.getByRole("link", { name: PROJECT_NAME }).first().click()
  23  |   await page.waitForURL(/\/projects\//)
  24  |   await ensureColumns(page, 2)
  25  | })
  26  | 
  27  | test.describe("Task lifecycle", () => {
  28  |   test("create a task, verify it appears in its column", async ({ page }) => {
  29  |     const title = `Write the report ${Date.now()}`
  30  | 
  31  |     await page.getByRole("button", { name: /add task/i }).first().click()
  32  |     await page.getByLabel(/title/i).fill(title)
  33  |     await page.getByRole("button", { name: /create task/i }).click()
  34  | 
  35  |     await expect(page.getByText(title)).toBeVisible()
  36  |   })
  37  | 
  38  |   test("edit an existing task's title and priority", async ({ page }) => {
  39  |     const title = `Editable task ${Date.now()}`
  40  |     await page.getByRole("button", { name: /add task/i }).first().click()
  41  |     await page.getByLabel(/title/i).fill(title)
  42  |     await page.getByRole("button", { name: /create task/i }).click()
  43  |     await expect(page.getByText(title)).toBeVisible()
  44  | 
  45  |     await page.getByText(title).click()
  46  |     const newTitle = `${title} (edited)`
  47  |     await page.getByLabel(/title/i).fill(newTitle)
  48  |     await page.getByLabel(/priority/i).selectOption("high")
  49  |     await page.getByRole("button", { name: /save changes/i }).click()
  50  | 
  51  |     await expect(page.getByText(newTitle)).toBeVisible()
  52  |   })
  53  | 
  54  |   test("delete a task with confirmation", async ({ page }) => {
  55  |     const title = `Deletable task ${Date.now()}`
  56  |     await page.getByRole("button", { name: /add task/i }).first().click()
  57  |     await page.getByLabel(/title/i).fill(title)
  58  |     await page.getByRole("button", { name: /create task/i }).click()
  59  |     await expect(page.getByText(title)).toBeVisible()
  60  | 
  61  |     page.once("dialog", (dialog) => dialog.accept())
  62  |     await page.getByText(title).click()
  63  |     await page.getByRole("button", { name: /Delete task/i }).click()
  64  | 
  65  |     await expect(page.getByText(title)).not.toBeVisible()
  66  |   })
  67  | 
  68  |   test("'create another' keeps the modal open for consecutive task entry", async ({ page }) => {
  69  |     await page.getByRole("button", { name: /add task/i }).first().click()
  70  |     await page.getByText("Create another task after this one", { exact: true }).click()
  71  | 
  72  |     const first = `Batch task 1 ${Date.now()}`
  73  |     await page.getByLabel(/title/i).fill(first)
  74  |     await page.getByRole("button", { name: /create.*another/i }).click()
  75  | 
  76  |     // modal re-opens blank, still in create mode
> 77  |     await expect(page.getByLabel(/title/i)).toHaveValue("")
      |                                             ^ Error: expect(locator).toHaveValue(expected) failed
  78  |     const second = `Batch task 2 ${Date.now()}`
  79  |     await page.getByLabel(/title/i).fill(second)
  80  |     await page.getByRole("button", { name: /create.*another/i }).click()
  81  | 
  82  |     await expect(page.getByText(first)).toBeVisible()
  83  |     await expect(page.getByText(second)).toBeVisible()
  84  |   })
  85  | 
  86  |   test("drag a task from one column to another and it persists after reload", async ({ page }) => {
  87  |     await ensureColumns(page, 3)
  88  |     const title = `Draggable task ${Date.now()}`
  89  |     const addTaskButtons = page.getByRole("button", { name: /add task/i })
  90  |     await addTaskButtons.first().click()
  91  |     await page.getByLabel(/title/i).fill(title)
  92  |     await page.getByRole("button", { name: /create task/i }).click()
  93  | 
  94  |     const card = page.getByText(title)
  95  |     const destination = addTaskButtons.nth(2).locator("xpath=../..")
  96  | 
  97  |     await card.hover()
  98  |     await page.mouse.down()
  99  |     await destination.hover()
  100 |     await page.mouse.move(0, 0, { steps: 5 }) // nudge to trigger dnd-kit's distance-based activation
  101 |     await destination.hover()
  102 |     await page.mouse.up()
  103 | 
  104 |     await expect(destination.getByText(title)).toBeVisible()
  105 | 
  106 |     await page.reload()
  107 |     await expect(
  108 |       page.getByRole("button", { name: /add task/i }).nth(2).locator("xpath=../..").getByText(title)
  109 |     ).toBeVisible()
  110 |   })
  111 | 
  112 |   test("adding a comment shows it in the Comments tab with an updated count", async ({ page }) => {
  113 |     const title = `Commentable task ${Date.now()}`
  114 |     await page.getByRole("button", { name: /add task/i }).first().click()
  115 |     await page.getByLabel(/title/i).fill(title)
  116 |     await page.getByRole("button", { name: /create task/i }).click()
  117 |     await expect(page.getByText(title)).toBeVisible()
  118 |     await page.getByText(title).click()
  119 | 
  120 |     await page.getByRole("button", { name: /comments/i }).click()
  121 |     const commentText = `Looks good to me — ${Date.now()}`
  122 |     await page.getByPlaceholder(/write a comment/i).fill(commentText)
  123 |     await page.getByRole("button", { name: "Post" }).click()
  124 | 
  125 |     await expect(page.getByText(commentText)).toBeVisible()
  126 |     await expect(page.getByRole("button", { name: /comments \(1\)/i })).toBeVisible()
  127 |   })
  128 | })
  129 | 
  130 | test.describe("Bulk operations", () => {
  131 |   test("multi-select via keyboard shortcut and bulk delete", async ({ page }) => {
  132 |     const titles = [`Bulk A ${Date.now()}`, `Bulk B ${Date.now()}`]
  133 |     for (const t of titles) {
  134 |       await page.getByRole("button", { name: /add task/i }).first().click()
  135 |       await page.getByLabel(/title/i).fill(t)
  136 |       await page.getByRole("button", { name: /create task/i }).click()
  137 |       await expect(page.getByText(t)).toBeVisible()
  138 |     }
  139 | 
  140 |     // click board background to ensure focus isn't in a text field, then
  141 |     // select-all per kanban-board.tsx's keyboard shortcut handling
  142 |     await page.locator("body").click({ position: { x: 5, y: 5 } })
  143 |     await page.keyboard.press("Control+a")
  144 | 
  145 |     page.once("dialog", (dialog) => dialog.accept())
  146 |     await page.keyboard.press("Delete")
  147 | 
  148 |     for (const t of titles) {
  149 |       await expect(page.getByText(t)).not.toBeVisible()
  150 |     }
  151 |   })
  152 | })
  153 | 
```