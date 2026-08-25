import { test as setup } from "@playwright/test"
import { setupClerkTestingToken } from "@clerk/testing/playwright"
import path from "node:path"

const authFile = path.join(__dirname, ".auth/user.json")
const PROJECT_NAME = "E2E Test Project"

// clerksetup() (registering the testing token for the whole run) now runs
// once in globalsetup - see e2e/global-setup.ts - so this only needs to
// apply that token to this page before driving the real sign-in form.
setup("authenticate", async ({ page }) => {
  await setupClerkTestingToken({ page })

  const testEmail = process.env.E2E_TEST_USER_EMAIL
  const testPassword = process.env.E2E_TEST_USER_PASSWORD
  if (!testEmail || !testPassword) {
    throw new Error(
      "E2E_TEST_USER_EMAIL / E2E_TEST_USER_PASSWORD must be set - create a dedicated " +
        "Clerk test-instance user for E2E runs, never a real account."
    )
  }

  await page.goto("/sign-in")
  await page.getByLabel(/email/i).fill(testEmail)
  await page.getByRole("button", { name: /continue/i }).click()
  await page.getByRole('textbox', { name: /password/i }).fill(testPassword)
  await page.getByRole("button", { name: /continue/i }).click()

  await page.waitForURL(/\/dashboard/)

  // several specs (board-task-lifecycle.spec.ts, project-and-members.spec.ts)
  // assume a project called "e2e test project" already exists on the
  // dashboard. seed it here, once, idempotently, rather than each spec
  // creating (and potentially duplicating) it.
  const projectLink = page.getByRole("link", { name: PROJECT_NAME })
  if ((await projectLink.count()) === 0) {
    await page.getByRole("button", { name: "New Project" }).click()
    await page.getByLabel(/name/i).fill(PROJECT_NAME)
    await page.getByRole("button", { name: /^create project$/i }).click()
    await page.waitForURL(/\/projects\/[^/]+$/)
    await page.goto("/dashboard")
  }

  await page.context().storageState({ path: authFile })
})