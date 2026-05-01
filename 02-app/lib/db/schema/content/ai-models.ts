import { boolean, index, integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'

/**
 * Registry of LLM models available for content generation. Decoupled from
 * `lib/llm/client.ts` MODELS const so models can be added/archived without
 * code changes. `provider_model_id` is the exact id passed to the provider SDK.
 *
 * `generation_runs.model_used` references `slug` by value (not FK) so archived
 * models survive in old runs.
 */
export const aiModels = pgTable('ai_models', {
  id: uuid('id').defaultRandom().primaryKey(),
  /** Stable slug; matches `lib/llm/client.ts` MODELS keys where applicable. */
  slug: varchar('slug', { length: 100 }).notNull(),
  /** Display name in the picker, e.g. "Claude Sonnet 4.6". */
  name: varchar('name', { length: 200 }).notNull(),
  /** 'anthropic' | 'google' | 'xai' | 'openai' */
  provider: varchar('provider', { length: 50 }).notNull(),
  /** Exact id passed to provider SDK, e.g. 'claude-sonnet-4-6'. */
  providerModelId: varchar('provider_model_id', { length: 200 }).notNull(),
  /** 'primary' | 'fast' | 'powerful' | 'fallback' | 'alternative'. Informational. */
  tier: varchar('tier', { length: 50 }),
  costInputPerMtok: numeric('cost_input_per_mtok', { precision: 10, scale: 4 }),
  costOutputPerMtok: numeric('cost_output_per_mtok', { precision: 10, scale: 4 }),
  contextWindow: integer('context_window'),
  /** Picker filters on this — only `is_active` rows show. */
  isActive: boolean('is_active').notNull().default(true),
  /** Excluded from picker but resolvable for old runs. */
  isArchived: boolean('is_archived').notNull().default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('ai_models_slug_idx').on(t.slug),
  index('ai_models_active_idx').on(t.isActive, t.isArchived),
])

export type AiModel = typeof aiModels.$inferSelect
export type NewAiModel = typeof aiModels.$inferInsert
