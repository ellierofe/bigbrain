import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { brands } from '../brands'
import { vector } from '../types'

// Table 1: base record — one per brand
export const dnaToneOfVoice = pgTable('dna_tone_of_voice', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  language: varchar('language', { length: 20 }).notNull().default('en-GB'),
  /** 'first_singular' | 'first_plural' | 'second' */
  grammaticalPerson: varchar('grammatical_person', { length: 50 }).notNull().default('first_singular'),
  /** { humour, reverence, formality, enthusiasm } each { score: 0-100, description: string } */
  dimensions: jsonb('dimensions'),
  summary: text('summary'),
  linguisticNotes: text('linguistic_notes'),
  emotionalResonance: text('emotional_resonance'),
  /** { preferred: string[], avoid: string[], notes?: string } */
  brandVocabulary: jsonb('brand_vocabulary'),
  generatedFromSamplesAt: timestamp('generated_from_samples_at', { withTimezone: true }),
  lastEditedByHumanAt: timestamp('last_edited_by_human_at', { withTimezone: true }),
  /** 'draft' | 'active' | 'archived' */
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// Table 2: writing samples library
export const dnaTovSamples = pgTable('dna_tov_samples', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  /** 'social' | 'email' | 'sales' | 'blog' | 'spoken' | 'other' */
  formatType: varchar('format_type', { length: 50 }).notNull(),
  subtype: varchar('subtype', { length: 100 }),
  body: text('body').notNull(),
  notes: text('notes'),
  sourceContext: text('source_context'),
  tonalTags: text('tonal_tags').array(),
  isCurrent: boolean('is_current').notNull().default(true),
  // Embedding of body (the sample text). Populated async by VEC-01 pipeline.
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('dna_tov_samples_format_current_idx').on(t.formatType, t.isCurrent),
  index('dna_tov_samples_embedding_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
])

// Table 3: per-format application deltas
export const dnaTovApplications = pgTable('dna_tov_applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  label: varchar('label', { length: 200 }).notNull(),
  /** 'social' | 'email' | 'sales' | 'blog' | 'spoken' | 'other' */
  formatType: varchar('format_type', { length: 50 }).notNull(),
  subtype: varchar('subtype', { length: 100 }),
  /** dimension deltas e.g. { formality: 15, enthusiasm: -10, notes: "..." } */
  dimensionDeltas: jsonb('dimension_deltas'),
  tonalTags: text('tonal_tags').array(),
  notes: text('notes'),
  doNotUse: text('do_not_use').array(),
  structuralGuidance: text('structural_guidance'),
  isCurrent: boolean('is_current').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type DnaToneOfVoice = typeof dnaToneOfVoice.$inferSelect
export type NewDnaToneOfVoice = typeof dnaToneOfVoice.$inferInsert
export type DnaTovSample = typeof dnaTovSamples.$inferSelect
export type NewDnaTovSample = typeof dnaTovSamples.$inferInsert
export type DnaTovApplication = typeof dnaTovApplications.$inferSelect
export type NewDnaTovApplication = typeof dnaTovApplications.$inferInsert
