import { boolean, index, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { brands } from '../brands'
import { vector } from '../types'

export const dnaKnowledgeAssets = pgTable('dna_knowledge_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),
  /** 'methodology' | 'framework' | 'process' | 'tool' | 'template' */
  kind: varchar('kind', { length: 50 }).notNull(),
  proprietary: boolean('proprietary').notNull().default(true),
  /** 'draft' | 'active' | 'archived' */
  status: varchar('status', { length: 50 }).notNull().default('active'),
  summary: text('summary'),
  principles: text('principles'),
  origin: text('origin'),
  /** Array of { title, description, sortOrder } */
  keyComponents: jsonb('key_components').notNull().default([]),
  /** Array of { step, title, description, clientExperience, decisionPoints } */
  flow: jsonb('flow').notNull().default([]),
  objectives: text('objectives'),
  problemsSolved: text('problems_solved'),
  contexts: text('contexts'),
  priorKnowledge: text('prior_knowledge'),
  resources: text('resources'),
  /** Soft refs: uuid[] → dna_audience_segments.id */
  targetAudienceIds: uuid('target_audience_ids').array(),
  /** Soft refs: uuid[] → dna_offers.id */
  relatedOfferIds: uuid('related_offer_ids').array(),
  graphNodeId: varchar('graph_node_id', { length: 200 }),
  // Embedding of concatenated summary + problemsSolved. Populated async by VEC-01 pipeline.
  embedding: vector('embedding', { dimensions: 1536 }),
  /** Kind-specific fields — see schema doc */
  detail: jsonb('detail'),
  visualPrompt: text('visual_prompt'),
  /** Array of { question, answer, type } */
  faqs: jsonb('faqs').notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('dna_knowledge_assets_embedding_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
])

export type DnaKnowledgeAsset = typeof dnaKnowledgeAssets.$inferSelect
export type NewDnaKnowledgeAsset = typeof dnaKnowledgeAssets.$inferInsert
