import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'

export const promptFragments = pgTable('prompt_fragments', {
  id: uuid('id').defaultRandom().primaryKey(),
  /** Machine-readable identifier used in prompt assembly. Unique per (slug, version). */
  slug: varchar('slug', { length: 100 }).notNull(),
  /** 'persona' | 'worldview' | 'craft' | 'context' | 'proofing' | 'output_contract' */
  kind: varchar('kind', { length: 50 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  purpose: text('purpose'),
  usage: text('usage'),
  content: text('content').notNull(),
  /** Declared expected placeholder names — array of strings */
  placeholders: jsonb('placeholders').notNull().default([]),
  /** Bumps on each edit; (slug, version) is unique */
  version: integer('version').notNull().default(1),
  /** 'draft' | 'active' | 'archived' */
  status: varchar('status', { length: 50 }).notNull().default('active'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('prompt_fragments_slug_version_idx').on(t.slug, t.version),
  index('prompt_fragments_kind_status_idx').on(t.kind, t.status),
])

export type PromptFragment = typeof promptFragments.$inferSelect
export type NewPromptFragment = typeof promptFragments.$inferInsert
