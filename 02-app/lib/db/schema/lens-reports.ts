import { index, integer, jsonb, pgTable, text, timestamp, uuid, varchar, type AnyPgColumn } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { brands } from './brands'
import { processingRuns } from './inputs/processing-runs'
import { vector } from './types'

// ---------------------------------------------------------------------------
// lens_reports — durable analysis-lens artefacts (INP-12)
// One row per committed-or-draft lens report. Distinct from processing_runs
// (transient compute records). Six of the seven lenses write a LensReport on
// commit (all except surface-extraction). Status lifecycle: draft → committed
// → superseded. Re-runs supersede via supersededById; old reports stay for audit.
// Mirrored as LensReport graph node (per ADR-002a).
// ---------------------------------------------------------------------------
export const lensReports = pgTable('lens_reports', {
  /** Same UUID is used as the LensReport graph node id. */
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),

  /** 'self-reflective' | 'project-synthesis' | 'pattern-spotting' |
   *  'catch-up' | 'decision-support' | 'content-ideas'.
   *  surface-extraction excluded — it writes no lens report. */
  lens: varchar('lens', { length: 30 }).notNull(),

  /** Editable. Auto-suggested from sources + lens at draft time. */
  title: varchar('title', { length: 300 }).notNull(),

  /** One-paragraph user-facing overview. Used as embedding text and retrieval preview. */
  summary: text('summary'),

  /** Lens-specific structured output. Shape varies by lens (typed in lib/types/processing.ts). */
  result: jsonb('result').notNull(),

  /** Free-form input that shaped the lens (e.g. decision text for decision-support). */
  lensInput: text('lens_input'),

  /** Sources the lens was applied to. Soft refs to src_source_documents.id. */
  sourceIds: uuid('source_ids').array().notNull().default(sql`'{}'::uuid[]`),

  /** The transient compute record that produced this report. ON DELETE restrict —
   *  reports are durable; deleting a run shouldn't silently destroy its report. */
  processingRunId: uuid('processing_run_id').notNull().references(() => processingRuns.id, { onDelete: 'restrict' }),

  /** 'draft' | 'committed' | 'superseded' */
  status: varchar('status', { length: 20 }).notNull().default('draft'),

  committedAt: timestamp('committed_at', { withTimezone: true }),

  /** Self-FK: when a re-run replaces this report on the same source set. */
  supersededById: uuid('superseded_by_id').references((): AnyPgColumn => lensReports.id, { onDelete: 'set null' }),

  /** Number of items the user confirmed and committed to the graph. */
  committedItemCount: integer('committed_item_count').notNull().default(0),

  /** OpenAI text-embedding-3-small of `title — summary`. Generated on commit. */
  embedding: vector('embedding', { dimensions: 1536 }),
  embeddingGeneratedAt: timestamp('embedding_generated_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('lens_reports_brand_status_idx').on(t.brandId, t.status),
  index('lens_reports_processing_run_idx').on(t.processingRunId),
  index('lens_reports_superseded_by_idx').on(t.supersededById),
  index('lens_reports_embedding_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
  index('lens_reports_source_ids_gin_idx').using('gin', t.sourceIds),
])

export type LensReport = typeof lensReports.$inferSelect
export type NewLensReport = typeof lensReports.$inferInsert
