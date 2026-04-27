import { index, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { brands } from './brands'
import { graphNodes } from './graph'
import { contacts } from './inputs'
import { srcStatistics, srcSourceDocuments } from './source'

// ---------------------------------------------------------------------------
// Mission phase enum
// ---------------------------------------------------------------------------
export const missionPhaseEnum = pgEnum('mission_phase', [
  'exploring',
  'synthesising',
  'producing',
  'complete',
  'paused',
])

// ---------------------------------------------------------------------------
// verticals — sector/industry lookup (canonical source for vertical names)
// ---------------------------------------------------------------------------
export const verticals = pgTable('verticals', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  graphNodeId: varchar('graph_node_id', { length: 100 }).references(() => graphNodes.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// missions — bounded research investigations
// ---------------------------------------------------------------------------
export const missions = pgTable('missions', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  thesis: text('thesis'),
  phase: missionPhaseEnum('phase').notNull().default('exploring'),
  graphNodeId: varchar('graph_node_id', { length: 100 }).references(() => graphNodes.id, { onDelete: 'set null' }),
  // client_project_id — column exists but FK deferred until CLIENT-01 builds client_projects table
  clientProjectId: uuid('client_project_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('missions_brand_idx').on(t.brandId),
  index('missions_phase_idx').on(t.phase),
])

// ---------------------------------------------------------------------------
// Join tables
// ---------------------------------------------------------------------------
export const missionVerticals = pgTable('mission_verticals', {
  missionId: uuid('mission_id').notNull().references(() => missions.id, { onDelete: 'cascade' }),
  verticalId: uuid('vertical_id').notNull().references(() => verticals.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('mission_verticals_mission_idx').on(t.missionId),
  index('mission_verticals_vertical_idx').on(t.verticalId),
])

export const missionContacts = pgTable('mission_contacts', {
  missionId: uuid('mission_id').notNull().references(() => missions.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('mission_contacts_mission_idx').on(t.missionId),
  index('mission_contacts_contact_idx').on(t.contactId),
])

export const missionStats = pgTable('mission_stats', {
  missionId: uuid('mission_id').notNull().references(() => missions.id, { onDelete: 'cascade' }),
  statId: uuid('stat_id').notNull().references(() => srcStatistics.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('mission_stats_mission_idx').on(t.missionId),
  index('mission_stats_stat_idx').on(t.statId),
])

export const missionInputs = pgTable('mission_inputs', {
  missionId: uuid('mission_id').notNull().references(() => missions.id, { onDelete: 'cascade' }),
  sourceDocumentId: uuid('source_document_id').notNull().references(() => srcSourceDocuments.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('mission_inputs_mission_idx').on(t.missionId),
  index('mission_inputs_source_idx').on(t.sourceDocumentId),
])

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type Vertical = typeof verticals.$inferSelect
export type NewVertical = typeof verticals.$inferInsert
export type Mission = typeof missions.$inferSelect
export type NewMission = typeof missions.$inferInsert
