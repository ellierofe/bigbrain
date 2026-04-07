import { pgTable, uuid, varchar, text, integer, jsonb, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { brands } from '../brands'
import { vector } from '../types'

export const dnaBrandMeaning = pgTable(
  'dna_brand_meaning',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
    vision: text('vision'),
    visionNotes: text('vision_notes'),
    mission: text('mission'),
    missionNotes: text('mission_notes'),
    purpose: text('purpose'),
    purposeNotes: text('purpose_notes'),
    values: jsonb('values'),
    // Embedding of concatenated vision + mission + purpose. Populated async by VEC-01 pipeline.
    embedding: vector('embedding', { dimensions: 1536 }),
    status: varchar('status', { length: 50 }).notNull().default('draft'),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('dna_brand_meaning_brand_idx').on(table.brandId),
    index('dna_brand_meaning_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
  ]
)

export type DnaBrandMeaning = typeof dnaBrandMeaning.$inferSelect
export type NewDnaBrandMeaning = typeof dnaBrandMeaning.$inferInsert
