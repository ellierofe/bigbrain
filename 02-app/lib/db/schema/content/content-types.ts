import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'

export const contentTypes = pgTable('content_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  /** Machine-readable identifier. Natural key — unique. E.g. `linkedin-post`, `sales-page-aida`. */
  slug: varchar('slug', { length: 100 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  /** Lucide icon name or token reference */
  icon: varchar('icon', { length: 50 }),
  /** Picker display grouping. 'sales' | 'email' | 'social' | 'long_form' | 'brainstorm' | 'outreach' | 'other'. Distinct from dna_platforms.category. */
  pickerGroup: varchar('picker_group', { length: 50 }).notNull(),
  /** Channel key from channel-taxonomy.md (e.g. 'linkedin', 'podcast', 'sales_page'). Resolves to dna_platforms.channel at the app layer. */
  platformType: varchar('platform_type', { length: 50 }).notNull(),
  /** Format bucket from channel-taxonomy.md (e.g. 'social_short', 'sales', 'newsletter'). Drives ToV cascade. */
  formatType: varchar('format_type', { length: 50 }).notNull(),
  /** Canonical leaf for ToV cascade (e.g. 'linkedin_post', 'cold_dm'). Optional; falls back to formatType. */
  subtype: varchar('subtype', { length: 50 }),
  /** True for OUT-02a (sales pages, web pages). V1 always false. */
  isMultiStep: boolean('is_multi_step').notNull().default(false),
  /** { channels: string[]; lead_magnets: string[]; dna: string[] }. See schema doc for resolution rules. */
  prerequisites: jsonb('prerequisites').notNull().default({ channels: [], lead_magnets: [], dna: [] }),
  /** Default variants per generation. 5 short-form / 1 long-form / 10 brainstorm-ideas. User overrides at runtime. */
  defaultVariantCount: integer('default_variant_count').notNull().default(5),
  /** Soft per-variant min character count. Used as Layer 8 hint. */
  defaultMinChars: integer('default_min_chars'),
  /** Soft per-variant max character count. */
  defaultMaxChars: integer('default_max_chars'),
  /** Whether the Infinite Prompt Engine (topic bar) shows. False for offer-driven types. */
  topicBarEnabled: boolean('topic_bar_enabled').notNull().default(true),
  /** Array of { id, required } declaring which Strategy panel fields show. */
  strategyFields: jsonb('strategy_fields').notNull().default([]),
  /** Layer 5 (Topic context) config. See schema doc. */
  topicContextConfig: jsonb('topic_context_config').notNull().default({}),
  /** True if SEO context should be injected at generation time (legacy carry-over). */
  seo: boolean('seo').notNull().default(false),
  /** 'awareness' | 'engagement' | 'consideration' | 'conversion' | 'retention' | 'advocacy'. Optional. */
  customerJourneyStage: varchar('customer_journey_stage', { length: 50 }),
  /** Estimated minutes saved per generation. Legacy carry-over for value reporting. */
  timeSavedMinutes: integer('time_saved_minutes'),
  /** 'draft' | 'active' | 'archived' */
  status: varchar('status', { length: 50 }).notNull().default('active'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('content_types_slug_idx').on(t.slug),
  index('content_types_picker_group_status_idx').on(t.pickerGroup, t.status),
  index('content_types_platform_type_status_idx').on(t.platformType, t.status),
  index('content_types_status_idx').on(t.status),
])

export type ContentType = typeof contentTypes.$inferSelect
export type NewContentType = typeof contentTypes.$inferInsert
