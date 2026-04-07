import { boolean, integer, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'
import { brands } from '../brands'

export const promptComponents = pgTable('prompt_components', {
  id: uuid('id').defaultRandom().primaryKey(),
  /** null = system-global; set = brand-specific override */
  brandId: uuid('brand_id').references(() => brands.id, { onDelete: 'cascade' }),
  /** Machine-readable slug used in prompt assembly. Unique per (brandId, slug). */
  slug: varchar('slug', { length: 100 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  /** 'copywriting' | 'proofing' | 'context' | 'structure' | 'formatting' */
  type: varchar('type', { length: 50 }).notNull(),
  purpose: text('purpose'),
  usage: text('usage'),
  content: text('content').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  version: integer('version').notNull().default(1),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('prompt_components_brand_slug_idx').on(t.brandId, t.slug),
])

export type PromptComponent = typeof promptComponents.$inferSelect
export type NewPromptComponent = typeof promptComponents.$inferInsert
