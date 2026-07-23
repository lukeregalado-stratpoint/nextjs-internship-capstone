import "dotenv/config"
import { defineConfig } from "drizzle-kit"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Check your .env.local file.")
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
})