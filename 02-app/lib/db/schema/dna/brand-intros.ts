import { boolean, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { brands } from '../brands'
import { dnaAudienceSegments } from './audience-segments'
import { dnaValueProposition } from './value-proposition'

export const dnaBrandIntros = pgTable('dna_brand_intros', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  /** 'tagline' | 'social_bio' | 'elevator_pitch' | 'one_liner' | 'speaker_bio' | 'press_description' | 'other' */
  kind: varchar('kind', { length: 50 }).notNull(),
  label: varchar('label', { length: 200 }),
  platform: varchar('platform', { length: 100 }),
  body: text('body').notNull(),
  characterCount: integer('character_count'),
  characterLimit: integer('character_limit'),
  wordCount: integer('word_count'),
  isCurrent: boolean('is_current').notNull().default(true),
  valuePropId: uuid('value_prop_id').references(() => dnaValueProposition.id, { onDelete: 'set null' }),
  audienceId: uuid('audience_id').references(() => dnaAudienceSegments.id, { onDelete: 'set null' }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type DnaBrandIntro = typeof dnaBrandIntros.$inferSelect
export type NewDnaBrandIntro = typeof dnaBrandIntros.$inferInsert
