import { clerkSetup } from "@clerk/testing/playwright"

/**
 * Runs once before any Playwright project, regardless of whether that
 * project depends on the "setup" project (see playwright.config.ts).
 * clerkSetup() registers a Testing Token with Clerk so bot-protection
 * doesn't block automated traffic — every spec that calls
 * setupClerkTestingToken() needs this to have already run once per
 * Playwright invocation. Requires CLERK_SECRET_KEY (see playwright.config.ts
 * webServer.env) pointed at a Clerk *test* instance.
 */
export default async function globalSetup() {
  await clerkSetup()
}
