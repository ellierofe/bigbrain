import { index, integer, numeric, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { contentTypes } from './content-types'
import { promptStages } from './prompt-stages'
import { generationRuns } from './generation-runs'

// ---------------------------------------------------------------------------
// generation_logs — permanent analytics record of every generation run
// ---------------------------------------------------------------------------
export const generationLogs = pgTable('generation_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  /** Originating run. SET NULL when the run is swept by TTL — log survives. */
  generationRunId: uuid('generation_run_id').references(() => generationRuns.id, { onDelete: 'set null' }),
  /** Denormalised onto the log so analytics survive run sweeps. RESTRICT — never delete a content type with logs. */
  contentTypeId: uuid('content_type_id').notNull().references(() => contentTypes.id, { onDelete: 'restrict' }),
  /** Denormalised onto the log. V2 multi-stage extension point: long-form runs produce one log per stage. */
  stageId: uuid('stage_id').notNull().references(() => promptStages.id, { onDelete: 'restrict' }),
  /** Resolved model slug (e.g. claude-opus-4-7). */
  modelUsed: varchar('model_used', { length: 100 }).notNull(),
  /** 'succeeded' | 'errored' */
  status: varchar('status', { length: 20 }).notNull(),
  /** Rough categorisation for errored runs. Free-form varchar; vocabulary in schema doc. */
  errorClass: varchar('error_class', { length: 50 }),
  /** Input tokens. Null on errors before the model was called. */
  promptTokens: integer('prompt_tokens'),
  /** Output tokens (sum across all variants). Null on pre-completion errors. */
  completionTokens: integer('completion_tokens'),
  /** promptTokens + completionTokens — stored for cheap aggregation. */
  totalTokens: integer('total_tokens'),
  /** Computed at log time from token counts × current model pricing. */
  costUsd: numeric('cost_usd', { precision: 10, scale: 6 }),
  /** Wall-clock from createdAt to completedAt. Null on incomplete or pre-call errors. */
  latencyMs: integer('latency_ms'),
  /** How many variants were requested. Carried forward even on errors. */
  variantCount: integer('variant_count').notNull(),
  /** 'sequential' | 'parallel' | 'batched'. Null in V1 sequential default. */
  streamingMode: varchar('streaming_mode', { length: 20 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('generation_logs_content_type_created_idx').on(t.contentTypeId, t.createdAt),
  index('generation_logs_model_created_idx').on(t.modelUsed, t.createdAt),
  index('generation_logs_status_created_idx').on(t.status, t.createdAt),
  index('generation_logs_created_idx').on(t.createdAt),
  index('generation_logs_generation_run_idx').on(t.generationRunId),
])

export type GenerationLog = typeof generationLogs.$inferSelect
export type NewGenerationLog = typeof generationLogs.$inferInsert
