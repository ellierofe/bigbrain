import { pgTable, uuid, varchar, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { brands } from '../brands'

export const dnaAudienceSegments = pgTable('dna_audience_segments', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  segmentName: varchar('segment_name', { length: 200 }).notNull(),
  personaName: varchar('persona_name', { length: 100 }),
  summary: text('summary'),
  demographics: jsonb('demographics'),
  psychographics: jsonb('psychographics'),
  roleContext: text('role_context'),
  problems: jsonb('problems').notNull().default([]),
  desires: jsonb('desires').notNull().default([]),
  objections: jsonb('objections').notNull().default([]),
  sharedBeliefs: jsonb('shared_beliefs').notNull().default([]),
  avatarPrompt: text('avatar_prompt'),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  /** 'draft' | 'active' | 'archived' */
  status: varchar('status', { length: 20 }).notNull().default('active'),
  sortOrder: integer('sort_order'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type DnaAudienceSegment = typeof dnaAudienceSegments.$inferSelect
export type NewDnaAudienceSegment = typeof dnaAudienceSegments.$inferInsert
