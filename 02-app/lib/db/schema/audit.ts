import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { brands } from './brands'
import { conversations } from './chat'

/**
 * Append-only log of every write to a write-eligible entity. UI-driven and
 * LLM-driven writes both pass through `lib/db/writes/*`, which logs here in
 * the same transaction as the entity write (atomic — if the audit insert
 * fails, the entity write rolls back).
 *
 * `actor` shape:
 *   - `ui:<path>`                              UI-driven (existing edit views)
 *   - `chat:<conversationId>`                  LLM ad-hoc write via db_update_bot
 *   - `skill:<skillId>:conversation:<id>`      Skill onComplete terminal save
 *
 * No `delete` op in v1.
 */
export const entityWrites = pgTable(
  'entity_writes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
    /** Entity type identifier — see lib/db/writes/types.ts WriteEntityType. */
    entityType: text('entity_type').notNull(),
    /** Foreign-id, no FK constraint (entity_type determines target table). */
    entityId: uuid('entity_id').notNull(),
    /** 'create' | 'update' — no deletes in v1. */
    op: text('op').notNull(),
    /** Field name for `update`; null for `create`. */
    field: text('field'),
    /** Previous value for `update`; null for `create`. */
    before: jsonb('before'),
    /** New value for `update`; full payload for `create`. */
    after: jsonb('after').notNull(),
    actor: text('actor').notNull(),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('entity_writes_lookup_idx').on(table.brandId, table.entityType, table.entityId, table.at),
  ]
)

/**
 * LLM-proposed writes awaiting user confirmation (or already decided).
 *
 * Lifecycle:
 *   pending → confirmed     (the write executed; entity_writes has the row)
 *           → rejected      (the user rejected; no entity_writes row)
 *
 * Decided rows are kept (not deleted) for trace continuity.
 */
export const pendingWrites = pgTable(
  'pending_writes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    /** Entity type identifier — matches entity_writes.entity_type. */
    entityType: text('entity_type').notNull(),
    /** Null for `create` and `generate` ops (no row exists yet). */
    entityId: uuid('entity_id'),
    /** 'update' | 'create' | 'generate'. */
    op: text('op').notNull(),
    /**
     * Discriminated by op:
     *   update   { field, before, after }
     *   create   { fields: { label, value }[]; rawPayload }
     *   generate { seedSummary; seedInputs }
     */
    payload: jsonb('payload').notNull(),
    /** 'pending' | 'confirmed' | 'rejected'. */
    status: text('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
  },
  (table) => [
    index('pending_writes_conversation_status_idx').on(table.conversationId, table.status),
  ]
)

export type EntityWrite = typeof entityWrites.$inferSelect
export type NewEntityWrite = typeof entityWrites.$inferInsert
export type PendingWrite = typeof pendingWrites.$inferSelect
export type NewPendingWrite = typeof pendingWrites.$inferInsert
