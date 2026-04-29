import { boolean, index, jsonb, pgTable, text, timestamp, uuid, varchar, type AnyPgColumn } from 'drizzle-orm/pg-core'
import { contentTypes } from './content-types'
import { promptStages } from './prompt-stages'

// ---------------------------------------------------------------------------
// generation_runs — system-of-record for in-flight + recently-generated content
// ---------------------------------------------------------------------------
export const generationRuns = pgTable('generation_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  /** Content type that produced this run. RESTRICT — never cascade-delete content types when runs reference them. */
  contentTypeId: uuid('content_type_id').notNull().references(() => contentTypes.id, { onDelete: 'restrict' }),
  /** Stage of the content type. V1 single-step types always have one. RESTRICT for the same reason. */
  stageId: uuid('stage_id').notNull().references(() => promptStages.id, { onDelete: 'restrict' }),
  /** Self-FK: regeneration source or upstream blueprint stage (V2). SET NULL — losing lineage doesn't invalidate. */
  parentRunId: uuid('parent_run_id').references((): AnyPgColumn => generationRuns.id, { onDelete: 'set null' }),
  /** 'generating' | 'complete' | 'errored' | 'cancelled' */
  status: varchar('status', { length: 20 }).notNull().default('generating'),
  /** Full GenerationInputs snapshot — frozen at submit. See lib/llm/content/types.ts. */
  inputs: jsonb('inputs').notNull(),
  /** The final assembled prompt text sent to the model. Null on pre-assembly errors. */
  assembledPrompt: text('assembled_prompt'),
  /** Map of { fragment_slug: version } for repro after fragment edits. */
  fragmentVersions: jsonb('fragment_versions').notNull().default({}),
  /** Resolved model slug (claude-opus-4-7, etc.). Null on pre-call errors. */
  modelUsed: varchar('model_used', { length: 100 }),
  /** Array of { id, text, status, saved_at?, library_item_id? }. See schema doc for shape. */
  variants: jsonb('variants').notNull().default([]),
  /** Populated when status = 'errored'. */
  errorText: text('error_text'),
  /** True once any variant has been saved to library. Disables TTL sweep. App-layer maintained. */
  kept: boolean('kept').notNull().default(false),
  /** TTL for daily sweep. Set to now() + 30 days at submit. Sweep: DELETE WHERE expires_at < now() AND kept = false. */
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  /** Set when status transitions to complete or errored. */
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('generation_runs_status_expires_at_idx').on(t.status, t.expiresAt),
  index('generation_runs_content_type_created_idx').on(t.contentTypeId, t.createdAt),
  index('generation_runs_stage_idx').on(t.stageId),
  index('generation_runs_parent_run_idx').on(t.parentRunId),
])

export type GenerationRun = typeof generationRuns.$inferSelect
export type NewGenerationRun = typeof generationRuns.$inferInsert
