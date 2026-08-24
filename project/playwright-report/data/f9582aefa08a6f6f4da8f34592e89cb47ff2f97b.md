# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: board-task-lifecycle.spec.ts >> Task lifecycle >> drag a task from one column to another and it persists after reload
- Location: e2e\board-task-lifecycle.spec.ts:86:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /add task/i }).nth(2).locator('../..').getByText('Draggable task 1787565535460')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByRole('button', { name: /add task/i }).nth(2).locator('../..').getByText('Draggable task 1787565535460')

```

```yaml
- link "WIP":
  - /url: /
- button "Close sidebar":
  - img
- button "Search":
  - img
  - text: Search
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
- button "Open sidebar":
  - img
- button "Notifications":
  - img
- button "Search":
  - img
- main:
  - link "Back to projects":
    - /url: /projects
    - img
    - text: Back to projects
  - heading "E2E Test Project" [level=1]
  - text: Owner
  - button "Edit project":
    - img
  - button "Delete project":
    - img
  - button "ET 1 member · Manage"
  - img
  - text: 14 lists
  - img
  - text: 6 tasks
  - img
  - textbox "Search tasks":
    - /placeholder: "Search tasks, or try \"assignee: jane\""
  - button "Drag to reorder column":
    - img
  - button "E2E Column 1787565362602"
  - text: "7"
  - button:
    - img
  - button "Add task":
    - img
  - button "Select task Draggable task 1787565535460 medium":
    - button "Select task Draggable task 1787565535460 medium":
      - button "Select task"
      - paragraph: Draggable task 1787565535460
      - text: medium
  - button "Select task Findable 1787565494398 medium":
    - button "Select task Findable 1787565494398 medium":
      - button "Select task"
      - paragraph: Findable 1787565494398
      - text: medium
  - button "Select task Write the report 1787565502149 medium":
    - button "Select task Write the report 1787565502149 medium":
      - button "Select task"
      - paragraph: Write the report 1787565502149
      - text: medium
  - button "Select task Editable task 1787565509237 medium":
    - button "Select task Editable task 1787565509237 medium":
      - button "Select task"
      - paragraph: Editable task 1787565509237
      - text: medium
  - button "Select task Deletable task 1787565517253 medium":
    - button "Select task Deletable task 1787565517253 medium":
      - button "Select task"
      - paragraph: Deletable task 1787565517253
      - text: medium
  - button "Select task Batch task 1 1787565525326 medium":
    - button "Select task Batch task 1 1787565525326 medium":
      - button "Select task"
      - paragraph: Batch task 1 1787565525326
      - text: medium
  - button "Select task Batch task 2 1787565529799 medium":
    - button "Select task Batch task 2 1787565529799 medium":
      - button "Select task"
      - paragraph: Batch task 2 1787565529799
      - text: medium
  - button "Add task":
    - img
    - text: Add task
  - button "Drag to reorder column":
    - img
  - button "E2E Column 1787565365801"
  - text: "0"
  - button:
    - img
  - button "Add task":
    - img
  - paragraph: No tasks yet
  - button "Add task":
    - img
    - text: Add task
  - button "Drag to reorder column":
    - img
  - button "E2E Column 1787565371787"
  - text: "0"
  - button:
    - img
  - button "Add task":
    - img
  - paragraph: No tasks yet
  - button "Add task":
    - img
    - text: Add task
  - button "Drag to reorder column":
    - img
  - button "E2E Column 1787565392568"
  - text: "0"
  - button:
    - img
  - button "Add task":
    - img
  - paragraph: No tasks yet
  - button "Add task":
    - img
    - text: Add task
  - button "Drag to reorder column":
    - img
  - button "E2E Column 1787565399730"
  - text: "0"
  - button:
    - img
  - button "Add task":
    - img
  - paragraph: No tasks yet
  - button "Add task":
    - img
    - text: Add task
  - button "Drag to reorder column":
    - img
  - button "E2E Column 1787565421360"
  - text: "0"
  - button:
    - img
  - button "Add task":
    - img
  - paragraph: No tasks yet
  - button "Add task":
    - img
    - text: Add task
  - button "Drag to reorder column":
    - img
  - button "E2E Column 1787565452283"
  - text: "0"
  - button:
    - img
  - button "Add task":
    - img
  - paragraph: No tasks yet
  - button "Add task":
    - img
    - text: Add task
  - button "Drag to reorder column":
    - img
  - button "E2E Column 1787565472387"
  - text: "0"
  - button:
    - img
  - button "Add task":
    - img
  - paragraph: No tasks yet
  - button "Add task":
    - img
    - text: Add task
  - button "Drag to reorder column":
    - img
  - button "E2E Column 1787565494315"
  - text: "0"
  - button:
    - img
  - button "Add task":
    - img
  - paragraph: No tasks yet
  - button "Add task":
    - img
    - text: Add task
  - button "Drag to reorder column":
    - img
  - button "E2E Column 1787565502063"
  - text: "0"
  - button:
    - img
  - button "Add task":
    - img
  - paragraph: No tasks yet
  - button "Add task":
    - img
    - text: Add task
  - button "Drag to reorder column":
    - img
  - button "E2E Column 1787565509132"
  - text: "0"
  - button:
    - img
  - button "Add task":
    - img
  - paragraph: No tasks yet
  - button "Add task":
    - img
    - text: Add task
  - button "Drag to reorder column":
    - img
  - button "E2E Column 1787565517142"
  - text: "0"
  - button:
    - img
  - button "Add task":
    - img
  - paragraph: No tasks yet
  - button "Add task":
    - img
    - text: Add task
  - button "Drag to reorder column":
    - img
  - button "E2E Column 1787565525112"
  - text: "0"
  - button:
    - img
  - button "Add task":
    - img
  - paragraph: No tasks yet
  - button "Add task":
    - img
    - text: Add task
  - button "Drag to reorder column":
    - img
  - button "E2E Column 1787565535348"
  - text: "0"
  - button:
    - img
  - button "Add task":
    - img
  - paragraph: No tasks yet
  - button "Add task":
    - img
    - text: Add task
  - button "Add column":
    - img
    - text: Add column
  - status: Draggable item d678f9b9-e9f8-4e7f-9ca8-472c248ad719 was dropped over droppable area 67e9fd73-6ef3-44fb-9d73-a6cb0abeeded
- alert
```

# Test source

```ts
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
  77  |     await expect(page.getByLabel(/title/i)).toHaveValue("")
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
> 104 |     await expect(destination.getByText(title)).toBeVisible()
      |                                                ^ Error: expect(locator).toBeVisible() failed
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