import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { brands } from './brands'
import { graphNodes } from './graph'
import { srcSourceDocuments, srcStatistics } from './source'
import { ideas } from './inputs/ideas'

// ---------------------------------------------------------------------------
// organisations — client companies and institutions
// ---------------------------------------------------------------------------
export const organisations = pgTable('organisations', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  graphNodeId: varchar('graph_node_id', { length: 100 }).references(() => graphNodes.id, { onDelete: 'set null' }),
  website: text('website'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('organisations_brand_idx').on(t.brandId),
])

// ---------------------------------------------------------------------------
// client_projects — scoped workspaces for client engagements
// ---------------------------------------------------------------------------
export const clientProjects = pgTable('client_projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  organisationId: uuid('organisation_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
  brief: text('brief'),
  /** active | paused | complete | archived */
  status: varchar('status', { length: 50 }).notNull().default('active'),
  graphNodeId: varchar('graph_node_id', { length: 100 }).references(() => graphNodes.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('client_projects_brand_idx').on(t.brandId),
  index('client_projects_org_idx').on(t.organisationId),
  index('client_projects_status_idx').on(t.status),
])

// ---------------------------------------------------------------------------
// Join tables — link items to projects
// ---------------------------------------------------------------------------

/** Link missions to projects */
export const projectMissions = pgTable('project_missions', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => clientProjects.id, { onDelete: 'cascade' }),
  // FK to missions table — column only, no reference() since missions imports would be circular
  missionId: uuid('mission_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('project_missions_project_idx').on(t.projectId),
  index('project_missions_mission_idx').on(t.missionId),
])

/** Link source documents (inputs) to projects */
export const projectInputs = pgTable('project_inputs', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => clientProjects.id, { onDelete: 'cascade' }),
  sourceDocumentId: uuid('source_document_id').notNull().references(() => srcSourceDocuments.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('project_inputs_project_idx').on(t.projectId),
  index('project_inputs_source_idx').on(t.sourceDocumentId),
])

/** Link statistics to projects */
export const projectStats = pgTable('project_stats', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => clientProjects.id, { onDelete: 'cascade' }),
  statId: uuid('stat_id').notNull().references(() => srcStatistics.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('project_stats_project_idx').on(t.projectId),
  index('project_stats_stat_idx').on(t.statId),
])

/** Link content items to projects (content registry doesn't exist yet — bare uuid) */
export const projectContent = pgTable('project_content', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => clientProjects.id, { onDelete: 'cascade' }),
  contentId: uuid('content_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('project_content_project_idx').on(t.projectId),
  index('project_content_content_idx').on(t.contentId),
])

/** Link ideas to projects */
export const ideaProjects = pgTable('idea_projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  ideaId: uuid('idea_id').notNull().references(() => ideas.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => clientProjects.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idea_projects_idea_idx').on(t.ideaId),
  index('idea_projects_project_idx').on(t.projectId),
])

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type Organisation = typeof organisations.$inferSelect
export type NewOrganisation = typeof organisations.$inferInsert
export type ClientProject = typeof clientProjects.$inferSelect
export type NewClientProject = typeof clientProjects.$inferInsert
