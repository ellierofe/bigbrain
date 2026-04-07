import { pgTable, uuid, varchar, text, integer, jsonb, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { brands } from '../brands'
import { vector } from '../types'

export const dnaValueProposition = pgTable(
  'dna_value_proposition',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
    coreStatement: text('core_statement'),
    targetCustomer: text('target_customer'),
    problemSolved: text('problem_solved'),
    outcomeDelivered: text('outcome_delivered'),
    uniqueMechanism: text('unique_mechanism'),
    differentiators: text('differentiators').array(),
    alternativesAddressed: jsonb('alternatives_addressed'),
    elevatorPitch: text('elevator_pitch'),
    internalNotes: text('internal_notes'),
    // Embedding of concatenated coreStatement + elevatorPitch. Populated async by VEC-01 pipeline.
    embedding: vector('embedding', { dimensions: 1536 }),
    status: varchar('status', { length: 50 }).notNull().default('draft'),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('dna_value_proposition_brand_idx').on(table.brandId),
    index('dna_value_proposition_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
  ]
)

export type DnaValueProposition = typeof dnaValueProposition.$inferSelect
export type NewDnaValueProposition = typeof dnaValueProposition.$inferInsert
