import { defineConfig } from "drizzle-kit"

// Drizzle config — fully wired in INF-02
// DATABASE_URL       — pooled connection (used by the app at runtime via @neondatabase/serverless)
// DATABASE_URL_UNPOOLED — direct connection (used by drizzle-kit for migrations)
// Both must be set in .env.local. Get the unpooled URL from Neon console → Connection string → uncheck "Pooled connection".

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema",
  out: "./lib/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
    ssl: true,
  },
})
