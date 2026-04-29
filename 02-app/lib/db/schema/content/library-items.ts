import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { contentTypes } from './content-types'
import { generationRuns } from './generation-runs'

// ---------------------------------------------------------------------------
// library_items — opt-in registry of saved content variants (supersedes REG-01)
// ---------------------------------------------------------------------------
export const libraryItems = pgTable('library_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  /** The run that produced this variant. SET NULL when the run is swept after kept=false flip. Library item survives. */
  generationRunId: uuid('generation_run_id').references(() => generationRuns.id, { onDelete: 'set null' }),
  /** The variant id within generation_runs.variants jsonb at save time. Trace-back ref. */
  variantId: varchar('variant_id', { length: 50 }),
  /** Denormalised so listings + filters survive run sweeps. RESTRICT — never delete a content type with library items. */
  contentTypeId: uuid('content_type_id').notNull().references(() => contentTypes.id, { onDelete: 'restrict' }),
  /** Markdown snapshot of the variant at save time. Mutates in place on edit; no version history. */
  text: text('text').notNull(),
  /** V2 long-form per-section structured content (e.g. [{section, copy, blueprint_ref}]). Null in V1 short-form. */
  structuredContent: jsonb('structured_content'),
  /** Array of typed tag objects ({ kind, id, label } + free_text variant). Pre-filled from generation context; editable. */
  tags: jsonb('tags').notNull().default([]),
  /** 'draft' | 'scheduled' | 'published' | 'archived' */
  publishStatus: varchar('publish_status', { length: 20 }).notNull().default('draft'),
  /** When published / scheduled. Drives future calendar views. */
  publishDate: timestamp('publish_date', { withTimezone: true }),
  /** Live URL once published. Text not varchar — URLs can be long, never queried against. */
  publishedUrl: text('published_url'),
  /** Channel key (channel-taxonomy.md). Falls back to content_types.platform_type on read. */
  platform: varchar('platform', { length: 50 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('library_items_content_type_created_idx').on(t.contentTypeId, t.createdAt),
  index('library_items_publish_status_date_idx').on(t.publishStatus, t.publishDate),
  index('library_items_platform_status_date_idx').on(t.platform, t.publishStatus, t.publishDate),
  index('library_items_generation_run_idx').on(t.generationRunId),
  index('library_items_created_idx').on(t.createdAt),
  index('library_items_tags_gin_idx').using('gin', t.tags),
])

export type LibraryItem = typeof libraryItems.$inferSelect
export type NewLibraryItem = typeof libraryItems.$inferInsert
