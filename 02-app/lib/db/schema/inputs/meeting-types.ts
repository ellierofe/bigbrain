import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { brands } from '../brands'

export const meetingTypes = pgTable('meeting_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  /** Case-insensitive substring patterns matched against meeting title on ingestion */
  matchPatterns: text('match_patterns').array().notNull().default([]),
  /** Tags applied to pending_inputs when a meeting matches this type */
  tags: text('tags').array().notNull().default([]),
  /** Optional override for the sourceType passed to extractFromText() */
  sourceTypeOverride: text('source_type_override'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type MeetingType = typeof meetingTypes.$inferSelect
export type NewMeetingType = typeof meetingTypes.$inferInsert
