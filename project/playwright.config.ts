import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

import { defineConfig, devices } from "@playwright/test"

const PORT = process.env.PORT ?? "3000"
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./e2e",
  // runs once before any project below - see e2e/global-setup.ts.
  globalSetup: "./e2e/global-setup.ts",
  // the e2e tests share one clerk user and one neon test database. running
  // mutations in parallel makes the fixture and board assertions race.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // e2e hits real clerk + neon test instances - cap workers in ci to avoid
  // rate limits / connection pool exhaustion on the shared test db.
  workers: 1,
  reporter: process.env.CI
    ? [["html", { open: "never" }], ["github"], ["junit", { outputFile: "e2e-results.xml" }]]
    : "html",
  timeout: 30_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/user.json" },
      dependencies: ["setup"],
      testIgnore: /.*\.unauth\.spec\.ts/,
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"], storageState: "e2e/.auth/user.json" },
      dependencies: ["setup"],
      testMatch: /.*board.*\.spec\.ts/, 
    },
    {
      name: "unauthenticated",
      use: {
        ...devices["Desktop Chrome"],
        storageState: { cookies: [], origins: [] },
      },
      testMatch: /.*\.unauth\.spec\.ts/,
    },
  ],

  webServer: {
    command: "pnpm build && pnpm start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // falls back to the app's normal dev env var names so you don't have
      // to duplicate them - set test_database_url / clerk_publishable_key
      // explicitly only if you want e2e pointed somewhere different (e.g.
      // a separate neon branch) than your everyday dev values.
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? "",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
        process.env.CLERK_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "",
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ?? "",
    },
  },
})
