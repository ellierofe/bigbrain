import { index, jsonb, pgTable, text, timestamp, uuid, varchar, type AnyPgColumn } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { brands } from '../brands'
import { lensReports } from '../lens-reports'
import { vector } from '../types'

// ---------------------------------------------------------------------------
// processing_runs — transient compute records (INP-12 v3)
// One row per LLM call against the Source × Lens model. Captures what was asked,
// what came back, and how the user resolved it. Not the durable artefact —
// that's lens_reports for analysis lenses, or graph nodes for surface-extraction.
// v3 (INP-12): renamed mode → lens; dropped title, analysis_result, topic_clusters;
// added sourceTypeFilter, lensInput, promptFragmentsUsed, lensReportId, errorMessage,
// tokenUsage. Embedding retained as deprecated.
// ---------------------------------------------------------------------------
export const processingRuns = pgTable('processing_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),

  /** Renamed from `mode` in v3. One of the 7 lens values per ADR-009:
   *  'surface-extraction' | 'self-reflective' | 'project-synthesis' |
   *  'pattern-spotting' | 'catch-up' | 'decision-support' | 'content-ideas' */
  lens: varchar('lens', { length: 30 }).notNull(),

  /** Soft refs to src_source_documents.id */
  sourceIds: uuid('source_ids').array().notNull().default([]),

  /** Optional: scoped to one source type when selection was multi-type. Mostly null in v1. */
  sourceTypeFilter: varchar('source_type_filter', { length: 40 }),

  /** Free-form input that shaped the run (e.g. decision text for decision-support). */
  lensInput: text('lens_input'),

  /** Array of { path, gitSha? } recording which schema-fragment files composed the prompt. */
  promptFragmentsUsed: jsonb('prompt_fragments_used').notNull().default([]),

  /** Only populated for lens='surface-extraction'. Raw ExtractionResult before user review. */
  extractionResult: jsonb('extraction_result'),

  /** Universal `unexpected[]` array (per `_base.md`). Populated only when lens='surface-extraction'
   *  (analysis lenses store theirs on `lens_reports.result.unexpected`). Default empty. */
  unexpected: jsonb('unexpected').notNull().default(sql`'[]'::jsonb`),

  /** Populated on commit for analysis lenses. Null for surface-extraction or pending runs.
   *  AnyPgColumn return-type breaks the circular type inference with lens_reports. */
  lensReportId: uuid('lens_report_id').references((): AnyPgColumn => lensReports.id, { onDelete: 'set null' }),

  /** 'pending' | 'committed' | 'skipped' | 'failed' */
  status: varchar('status', { length: 20 }).notNull().default('pending'),

  /** Populated when status='failed'. */
  errorMessage: text('error_message'),

  /** { promptTokens, completionTokens, totalTokens, model } captured from LLM response. */
  tokenUsage: jsonb('token_usage'),

  committedAt: timestamp('committed_at', { withTimezone: true }),

  /** @deprecated v3 — embedding lives on lens_reports for analysis lenses; surface-extraction
   *  uses per-item node embeddings. Retained as nullable for backward compat; not populated by new code. */
  embedding: vector('embedding', { dimensions: 1536 }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('processing_runs_brand_status_idx').on(t.brandId, t.status),
  index('processing_runs_lens_report_idx').on(t.lensReportId),
  index('processing_runs_source_ids_gin_idx').using('gin', t.sourceIds),
  index('processing_runs_embedding_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
])

export type ProcessingRun = typeof processingRuns.$inferSelect
export type NewProcessingRun = typeof processingRuns.$inferInsert
