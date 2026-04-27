import { date, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { brands } from '../brands'
import { srcSourceDocuments } from '../source'

export const pendingInputs = pgTable('pending_inputs', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  /** 'krisp-meeting' for now; extensible for voice notes, research docs, etc. */
  sourceType: text('source_type').notNull(),
  title: text('title').notNull(),
  inputDate: date('input_date'),
  /** 32-char hex Krisp meeting ID — unique per brand where set */
  krispMeetingId: text('krisp_meeting_id'),
  rawText: text('raw_text'),
  /** Full ExtractionResult from extractFromText() — immutable after creation */
  extractionResult: jsonb('extraction_result').notNull(),
  /** contacts.id array — resolved at ingestion time */
  participantIds: uuid('participant_ids').array(),
  /** Auto-applied from meeting_types match + any manual tags added at review */
  tags: text('tags').array(),
  /** 'pending' | 'committed' | 'skipped' */
  status: text('status').notNull().default('pending'),
  committedAt: timestamp('committed_at', { withTimezone: true }),
  /** Set on commit via INP-07 */
  sourceDocumentId: uuid('source_document_id').references(() => srcSourceDocuments.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  // Prevents duplicate ingestion of the same Krisp meeting — Postgres excludes nulls automatically
  uniqueIndex('pending_inputs_brand_krisp_idx').on(t.brandId, t.krispMeetingId),
  index('pending_inputs_brand_status_idx').on(t.brandId, t.status),
])

export type PendingInput = typeof pendingInputs.$inferSelect
export type NewPendingInput = typeof pendingInputs.$inferInsert
