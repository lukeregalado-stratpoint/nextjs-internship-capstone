import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "node:path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    globals: true,
    css: true,
    // Two projects so coverage can attribute unit vs. integration tests
    // separately if needed later; both run under the same jsdom env for now.
    include: [
      "components/**/*.test.{ts,tsx}",
      "hooks/**/*.test.{ts,tsx}",
      "lib/**/*.test.{ts,tsx}",
      "stores/**/*.test.{ts,tsx}",
    ],
    exclude: ["e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      include: [
        "components/**/*.{ts,tsx}",
        "hooks/**/*.{ts,tsx}",
        "lib/actions/**/*.ts",
        "lib/*.ts",
        "stores/**/*.ts",
      ],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.d.ts",
        "app/**", // covered by Playwright E2E instead
        "components/ui/**", // shadcn primitives, not our logic
        "db/migrations/**",
      ],
      thresholds: {
        // Deliberately modest starting bar — ratchet these up as coverage
        // grows instead of gating CI red on day one. See CI workflow notes.
        lines: 60,
        statements: 60,
        functions: 55,
        branches: 50,
      },
    },
  },
})
