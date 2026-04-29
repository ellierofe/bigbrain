import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, varchar, type AnyPgColumn } from 'drizzle-orm/pg-core'

// ---------------------------------------------------------------------------
// topic_paths — Topic Engine cascade catalogue (1–4 step tree)
// ---------------------------------------------------------------------------
export const topicPaths = pgTable('topic_paths', {
  id: uuid('id').defaultRandom().primaryKey(),
  /** Self-FK to parent node. Null for step-1 categories. CASCADE — deleting a parent kills the sub-tree. */
  parentId: uuid('parent_id').references((): AnyPgColumn => topicPaths.id, { onDelete: 'cascade' }),
  /** Materialised dotted path from root, e.g. 'audience.segment.problems.item'. Natural key for seeds + topic_chain refs. */
  path: varchar('path', { length: 200 }).notNull(),
  /** 1–4. Position in the cascade. Matches step1/step2/step3/step4 keys in TopicChain. */
  stepLevel: integer('step_level').notNull(),
  /** Top-level category slug (denormalised onto every descendant). 'audience' | 'offer' | 'knowledge_asset' | 'platform' | 'value_proposition' | 'brand_meaning' | 'brand_proof' | 'source_material' | 'own_research' | 'mission' | 'idea' | 'free_text'. */
  category: varchar('category', { length: 50 }).notNull(),
  /** User-facing label rendered in the picker UI. */
  label: varchar('label', { length: 200 }).notNull(),
  /** 'category' | 'sub_category' | 'entity' | 'aspect' | 'item'. Drives picker UI render mode. */
  surfaceKind: varchar('surface_kind', { length: 20 }).notNull(),
  /** Declarative query config — { kind: 'static' | 'table' | 'jsonb_array' | 'joined' | 'single', ... }. See schema doc. */
  dataQuery: jsonb('data_query').notNull().default({}),
  /** Declarative gate evaluated at picker render — same vocabulary as dataQuery, interpreted as has-data check. */
  hasDataCheck: jsonb('has_data_check'),
  /** True only at item-surfacing leaves (per architecture doc Part 3.3). */
  multiSelect: boolean('multi_select').notNull().default(false),
  /** Leaf-only Layer 5 sentence with ${...} placeholders. Null on non-leaf rows. */
  promptTemplate: text('prompt_template'),
  /** Optional explicit pointer to the next step row. Mostly redundant with parentId reverse lookup; for V2 shared sub-trees. */
  nextStepId: uuid('next_step_id').references((): AnyPgColumn => topicPaths.id, { onDelete: 'set null' }),
  /** Sort order within siblings (same parentId). */
  displayOrder: integer('display_order').notNull().default(0),
  /** 'draft' | 'active' | 'archived' */
  status: varchar('status', { length: 50 }).notNull().default('active'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('topic_paths_path_idx').on(t.path),
  index('topic_paths_parent_display_order_idx').on(t.parentId, t.displayOrder),
  index('topic_paths_category_status_step_idx').on(t.category, t.status, t.stepLevel),
  index('topic_paths_step_level_status_idx').on(t.stepLevel, t.status),
])

export type TopicPath = typeof topicPaths.$inferSelect
export type NewTopicPath = typeof topicPaths.$inferInsert
