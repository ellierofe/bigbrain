import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { brands } from '../brands'
import { vector } from '../types'

export const processingRuns = pgTable('processing_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  /** 'individual' | 'batch' | 'reflective' | 'synthesis' */
  mode: text('mode').notNull(),
  /** Array of src_source_documents.id that were inputs to this run */
  sourceIds: uuid('source_ids').array().notNull().default([]),
  title: text('title'),
  /** For mode 'individual': the ExtractionResult. Null for other modes. */
  extractionResult: jsonb('extraction_result'),
  /** For modes 'batch' / 'reflective' / 'synthesis': the structured analysis output. */
  analysisResult: jsonb('analysis_result'),
  /** Topic clusters if generated */
  topicClusters: jsonb('topic_clusters'),
  /** 'pending' | 'committed' | 'skipped' */
  status: text('status').notNull().default('pending'),
  committedAt: timestamp('committed_at', { withTimezone: true }),
  /** Embedding of title + analysis summary. For semantic search over analysis results. */
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('processing_runs_brand_status_idx').on(t.brandId, t.status),
  index('processing_runs_embedding_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
])

export type ProcessingRun = typeof processingRuns.$inferSelect
export type NewProcessingRun = typeof processingRuns.$inferInsert
