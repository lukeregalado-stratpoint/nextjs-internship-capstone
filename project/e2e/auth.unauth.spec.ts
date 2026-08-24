import { test, expect } from "@playwright/test"
import { setupClerkTestingToken } from "@clerk/testing/playwright"

test.beforeEach(async ({ page }) => {
  await setupClerkTestingToken({ page })
})

test("unauthenticated users are redirected away from the dashboard", async ({ page }) => {
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/sign-in/)
})

test("signing in with valid credentials lands on the dashboard", async ({ page }) => {
  const email = process.env.E2E_TEST_USER_EMAIL
  const password = process.env.E2E_TEST_USER_PASSWORD
  test.skip(!email || !password, "E2E_TEST_USER_EMAIL / E2E_TEST_USER_PASSWORD not set")

  await page.goto("/sign-in")
  await page.getByLabel(/email/i).fill(email!)
  await page.getByRole("button", { name: /continue/i }).click()
  await page.getByRole('textbox', { name: /password/i }).fill(password!)
  await page.getByRole("button", { name: /continue/i }).click()

  await expect(page).toHaveURL(/\/dashboard/)
})

test("signing in with an invalid password shows an error and stays on sign-in", async ({ page }) => {
  const email = process.env.E2E_TEST_USER_EMAIL
  test.skip(!email, "E2E_TEST_USER_EMAIL not set")

  await page.goto("/sign-in")
  await page.getByLabel(/email/i).fill(email!)
  await page.getByRole("button", { name: /continue/i }).click()
  await page.getByRole('textbox', { name: /password/i }).fill("definitely-wrong-password")
  await page.getByRole("button", { name: /continue/i }).click()

  await expect(page.getByTestId('form-feedback-error')).toContainText(/incorrect|invalid|wrong/i)
  await expect(page).toHaveURL(/\/sign-in/)
})
