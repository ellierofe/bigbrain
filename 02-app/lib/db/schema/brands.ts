import {
  boolean,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"

export const brands = pgTable(
  "brands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("brands_slug_idx").on(table.slug)]
)

// brand_users.userId → users.id FK is intentionally omitted here.
// The `users` table is created by Auth.js (INF-05) and does not exist yet.
// The FK constraint will be added in the INF-05 migration.
export const brandUsers = pgTable(
  "brand_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    // userId references auth.js users table — FK added in INF-05 migration
    userId: uuid("user_id").notNull(),
    role: varchar("role", { length: 50 }).notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("brand_users_brand_user_idx").on(table.brandId, table.userId),
    uniqueIndex("brand_users_user_idx").on(table.userId),
  ]
)
