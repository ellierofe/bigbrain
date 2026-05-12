import { index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { brands } from './brands'

// ---------------------------------------------------------------------------
// conversations — chat conversation threads
// ---------------------------------------------------------------------------
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    /** v2 branching: the message this conversation branches from */
    parentMessageId: uuid('parent_message_id'),
    /** Skill registry ID, validated at runtime. Null = freeform chat. */
    skillId: text('skill_id'),
    /** In-flight skill state (gathered, checklist, currentStage, etc.). Per-skill shape. */
    skillState: jsonb('skill_state'),
    /** Per-conversation context pane state. Shape: { selectedTabId: string }. */
    contextPaneState: jsonb('context_pane_state'),
  },
  (table) => [
    index('conversations_brand_updated_idx').on(table.brandId, table.updatedAt),
    index('conversations_skill_id_idx').on(table.skillId),
  ]
)

// ---------------------------------------------------------------------------
// messages — individual chat messages within a conversation
// ---------------------------------------------------------------------------
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull(), // 'user' | 'assistant' | 'system'
    content: text('content').notNull(),
    /** Array of { type, url, name, size } for images/files */
    attachments: jsonb('attachments'),
    /** Array of tool invocations — { name, args, result } for UI display */
    toolCalls: jsonb('tool_calls'),
    /** Structured metadata for system-attributed messages.
     * Shape: { kind: 'write-confirmation' | 'generation-complete' | 'generation-failed', ... }
     * Used by SystemMessageDivider rendering branch. */
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    /** Optional — for future cost tracking */
    tokenCount: integer('token_count'),
  },
  (table) => [
    index('messages_conversation_created_idx').on(table.conversationId, table.createdAt),
  ]
)
