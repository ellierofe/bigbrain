import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { brands } from '../brands'

export const ideas = pgTable('ideas', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  /** 'idea' | 'question' */
  type: text('type').notNull().default('idea'),
  /** 'captured' | 'shelved' | 'done' */
  status: text('status').notNull().default('captured'),
  /** 'manual' | 'ai_surfaced' */
  source: text('source').notNull().default('manual'),
  /** Route the user was on when they captured this */
  contextPage: text('context_page'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('ideas_brand_status_idx').on(t.brandId, t.status),
])

/**
 * Polymorphic tag table — links ideas to any entity type.
 * entity_type: 'mission' | 'client_project' | 'offer' | 'knowledge_asset' | 'audience_segment'
 * entity_id: UUID of the target entity (no FK — polymorphic)
 */
export const ideaTags = pgTable('idea_tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  ideaId: uuid('idea_id').notNull().references(() => ideas.id, { onDelete: 'cascade' }),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('idea_tags_unique_idx').on(t.ideaId, t.entityType, t.entityId),
  index('idea_tags_idea_idx').on(t.ideaId),
  index('idea_tags_entity_idx').on(t.entityType, t.entityId),
])
