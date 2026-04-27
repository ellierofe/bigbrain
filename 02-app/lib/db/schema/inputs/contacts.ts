import { index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'
import { brands } from '../brands'

export const contacts = pgTable('contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email'),
  organisation: text('organisation'),
  role: text('role'),
  /** FK to graph_nodes.id (varchar 100) — set when Person node created at commit time */
  graphNodeId: varchar('graph_node_id', { length: 100 }),
  /** Krisp's internal participant identifier — returned by MCP if available */
  krispParticipantId: text('krisp_participant_id'),
  /** 'client' | 'peer' | 'prospect' | 'podcast-guest' | 'interviewee' | 'other' */
  contactType: text('contact_type'),
  tags: text('tags').array(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  // Unique per brand where email is set — Postgres excludes nulls from unique indexes automatically
  uniqueIndex('contacts_brand_email_idx').on(t.brandId, t.email),
  index('contacts_brand_name_idx').on(t.brandId, t.name),
  // GIN trigram index for fuzzy name search (pg_trgm) — defined in migration SQL, not here
])

export type Contact = typeof contacts.$inferSelect
export type NewContact = typeof contacts.$inferInsert
