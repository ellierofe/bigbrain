import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'
import { contentTypes } from './content-types'
import { promptFragments } from './prompt-fragments'

// ---------------------------------------------------------------------------
// Stage kind enum
// ---------------------------------------------------------------------------
export const stageKindEnum = pgEnum('stage_kind', [
  'single',
  'blueprint',
  'copy',
  'synthesis',
])

// ---------------------------------------------------------------------------
// prompt_stages — per-stage prompt content for the eight-layer assembler
// ---------------------------------------------------------------------------
export const promptStages = pgTable('prompt_stages', {
  id: uuid('id').defaultRandom().primaryKey(),
  /** Parent content type. Cascade — stages are meaningless without their parent. */
  contentTypeId: uuid('content_type_id').notNull().references(() => contentTypes.id, { onDelete: 'cascade' }),
  /** Execution order. 1, 2, 3… Single-step types always have stageOrder=1. */
  stageOrder: integer('stage_order').notNull(),
  /** 'single' | 'blueprint' | 'copy' | 'synthesis' */
  stageKind: stageKindEnum('stage_kind').notNull(),
  /** Layer 1 — Persona fragment. Restrict — fragments are append-only-versioned; archive instead of delete. */
  personaFragmentId: uuid('persona_fragment_id').notNull().references(() => promptFragments.id, { onDelete: 'restrict' }),
  /** Layer 2 — Worldview fragment. Nullable — not all stages declare a worldview. */
  worldviewFragmentId: uuid('worldview_fragment_id').references(() => promptFragments.id, { onDelete: 'restrict' }),
  /** Layer 3 — Task framing. Hand-authored per stage. */
  taskFraming: text('task_framing').notNull(),
  /** Layer 6 — Structural skeleton with ${placeholder} and ${fragment_slug} substitutions. */
  structuralSkeleton: text('structural_skeleton').notNull(),
  /** Layer 7 — Craft fragment config. See schema doc for shape (list / tiered / empty). */
  craftFragmentConfig: jsonb('craft_fragment_config').notNull().default({}),
  /** Layer 8 — Output contract fragment. */
  outputContractFragmentId: uuid('output_contract_fragment_id').notNull().references(() => promptFragments.id, { onDelete: 'restrict' }),
  /** Per-stage tweaks appended to the resolved Layer 8 fragment. */
  outputContractExtras: text('output_contract_extras'),
  /** Optional model slug override (e.g. 'claude-sonnet-4-6'). Null = use runtime default per model hierarchy. */
  defaultModel: varchar('default_model', { length: 100 }),
  /** Per-stage soft min token count. */
  minTokens: integer('min_tokens'),
  /** Per-stage soft max token count. */
  maxTokens: integer('max_tokens'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('prompt_stages_content_type_stage_order_idx').on(t.contentTypeId, t.stageOrder),
  index('prompt_stages_persona_fragment_idx').on(t.personaFragmentId),
  index('prompt_stages_worldview_fragment_idx').on(t.worldviewFragmentId),
  index('prompt_stages_output_contract_fragment_idx').on(t.outputContractFragmentId),
])

export type PromptStage = typeof promptStages.$inferSelect
export type NewPromptStage = typeof promptStages.$inferInsert
