import { boolean, date, index, integer, jsonb, pgTable, smallint, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { brands } from './brands'
import { vector } from './types'

// ---------------------------------------------------------------------------
// src_source_documents — original files (PDFs, transcripts, etc.)
// v3 (INP-12): added sourceType controlled vocab, authority, summary, chunk_count.
// ---------------------------------------------------------------------------
export const srcSourceDocuments = pgTable('src_source_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 300 }).notNull(),

  /** Controlled vocabulary per ADR-009. Drives extraction prompt fragment selection.
   *  'client-interview' | 'coaching-call' | 'peer-conversation' | 'supplier-conversation' |
   *  'accountability-checkin' | 'meeting-notes' | 'internal-notes' | 'research-document' |
   *  'dataset' | 'pitch-deck' | 'report' | 'collection' | 'content-idea' */
  sourceType: varchar('source_type', { length: 40 }).notNull(),

  /** Evidence weight, orthogonal to source type. Used by retrieval to weight sources.
   *  'own' | 'peer' | 'external-authoritative' | 'external-sample' */
  authority: varchar('authority', { length: 30 }).notNull(),

  description: text('description'),

  /** ~300-word LLM-generated summary of source content. Stored on SourceDocument graph node
   *  description property (per ADR-002a §3 narrow exception to no-AI-inference rule). */
  summary: text('summary'),
  summaryGeneratedAt: timestamp('summary_generated_at', { withTimezone: true }),

  /** Convenience count of src_source_chunks rows. Maintained app-side. Zero for dataset/collection. */
  chunkCount: integer('chunk_count').notNull().default(0),

  /** Vercel Blob URL. Nullable — paste-only inputs (INP-03) have no file. */
  fileUrl: varchar('file_url', { length: 500 }),
  fileSize: integer('file_size'),
  mimeType: varchar('mime_type', { length: 100 }),

  /** Plain text from file or paste. Source for chunking + summary. Immutable post-ingest (app rule). */
  extractedText: text('extracted_text'),

  externalSource: varchar('external_source', { length: 500 }),

  /** Free-form tags. Auto-suggestions at ingest, fully editable. */
  tags: text('tags').array().notNull().default(sql`'{}'::text[]`),

  /** References to Person graph nodes. Suggested from speaker-turn analysis at ingest. */
  participantIds: uuid('participant_ids').array().notNull().default(sql`'{}'::uuid[]`),

  /** 'new' | 'triaged' | null. Drives "NEW" label on Sources page (per INP-12). */
  inboxStatus: text('inbox_status'),

  /** Array of { date, lens, processingRunId, lensReportId? } per ADR-009. */
  processingHistory: jsonb('processing_history').notNull().default([]),

  documentDate: date('document_date'),
  isArchived: boolean('is_archived').notNull().default(false),

  /** OpenAI text-embedding-3-small of `title — summary`. Re-embedded when summary changes. */
  embedding: vector('embedding', { dimensions: 1536 }),
  embeddingGeneratedAt: timestamp('embedding_generated_at', { withTimezone: true }),

  /** Krisp meeting identifier — unique per (brandId, krispMeetingId). */
  krispMeetingId: text('krisp_meeting_id'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('src_source_documents_embedding_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
  uniqueIndex('src_source_documents_brand_krisp_idx').on(t.brandId, t.krispMeetingId),
  index('src_source_documents_brand_source_type_idx').on(t.brandId, t.sourceType),
  index('src_source_documents_brand_inbox_status_idx').on(t.brandId, t.inboxStatus),
  index('src_source_documents_tags_gin_idx').using('gin', t.tags),
  index('src_source_documents_participant_ids_gin_idx').using('gin', t.participantIds),
])

// ---------------------------------------------------------------------------
// src_statistics — citeable data points and research stats
// ---------------------------------------------------------------------------
export const srcStatistics = pgTable('src_statistics', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  stat: text('stat').notNull(),
  shortLabel: varchar('short_label', { length: 200 }),
  source: varchar('source', { length: 500 }).notNull(),
  sourceUrl: varchar('source_url', { length: 500 }),
  sourceYear: smallint('source_year'),
  notes: text('notes'),
  topic: varchar('topic', { length: 200 }),
  tags: text('tags').array(),
  /** Soft refs: uuid[] → dna_audience_segments.id */
  audienceSegmentIds: uuid('audience_segment_ids').array(),
  /** Soft refs: uuid[] → dna_offers.id */
  offerIds: uuid('offer_ids').array(),
  /** Soft refs: uuid[] → dna_content_pillars.id (parked — populated when feature built) */
  contentPillarIds: uuid('content_pillar_ids').array(),
  /** Soft refs: uuid[] → dna_knowledge_assets.id */
  methodologyIds: uuid('methodology_ids').array(),
  isArchived: boolean('is_archived').notNull().default(false),
  // Embedding of concatenated stat + notes. Populated async by VEC-01 pipeline.
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('src_statistics_embedding_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
])

// ---------------------------------------------------------------------------
// src_testimonials — client quotes and social proof
// ---------------------------------------------------------------------------
export const srcTestimonials = pgTable('src_testimonials', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  clientName: varchar('client_name', { length: 200 }).notNull(),
  clientTitle: varchar('client_title', { length: 200 }),
  clientCompany: varchar('client_company', { length: 200 }),
  quote: text('quote').notNull(),
  editedQuote: text('edited_quote'),
  result: text('result'),
  context: text('context'),
  /** 'quote' | 'written' | 'video' | 'case-study' */
  type: varchar('type', { length: 50 }).notNull().default('quote'),
  sourceUrl: varchar('source_url', { length: 500 }),
  mediaUrl: varchar('media_url', { length: 500 }),
  /** Soft refs: uuid[] → dna_audience_segments.id */
  audienceSegmentIds: uuid('audience_segment_ids').array(),
  /** Soft refs: uuid[] → dna_offers.id */
  offerIds: uuid('offer_ids').array(),
  tags: text('tags').array(),
  isPublic: boolean('is_public').notNull().default(true),
  isArchived: boolean('is_archived').notNull().default(false),
  collectedAt: date('collected_at'),
  // Embedding of quote (or editedQuote if present). Populated async by VEC-01 pipeline.
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('src_testimonials_embedding_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
])

// ---------------------------------------------------------------------------
// src_stories — narratives for content
// ---------------------------------------------------------------------------
export const srcStories = pgTable('src_stories', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 300 }).notNull(),
  /** 'self' | 'client' | 'peer' | 'business' | 'project' */
  subject: varchar('subject', { length: 50 }).notNull(),
  narrative: text('narrative').notNull(),
  hook: text('hook'),
  tension: text('tension'),
  resolution: text('resolution'),
  lesson: text('lesson'),
  /** 'origin' | 'client-win' | 'failure-learning' | 'pivot' | 'belief' | 'behind-the-scenes' | 'other' */
  type: varchar('type', { length: 50 }).notNull().default('origin'),
  /** Soft refs: uuid[] → dna_audience_segments.id */
  audienceSegmentIds: uuid('audience_segment_ids').array(),
  /** Soft refs: uuid[] → dna_content_pillars.id */
  contentPillarIds: uuid('content_pillar_ids').array(),
  tags: text('tags').array(),
  isPublic: boolean('is_public').notNull().default(true),
  isArchived: boolean('is_archived').notNull().default(false),
  occurredAt: date('occurred_at'),
  // Embedding of narrative. Populated async by VEC-01 pipeline.
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('src_stories_embedding_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
])

// ---------------------------------------------------------------------------
// src_own_research — original studies, surveys, analyses
// ---------------------------------------------------------------------------
export const srcOwnResearch = pgTable('src_own_research', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 300 }).notNull(),
  shortLabel: varchar('short_label', { length: 200 }),
  /** 'survey' | 'analysis' | 'audit' | 'case-study' | 'experiment' | 'framework-validation' | 'other' */
  type: varchar('type', { length: 50 }).notNull(),
  summary: text('summary').notNull(),
  methodology: text('methodology'),
  /** Array of { finding, significance, tags } */
  keyFindings: jsonb('key_findings').notNull().default([]),
  /** Soft refs: uuid[] → src_source_documents.id */
  sourceDocumentIds: uuid('source_document_ids').array(),
  publishedUrl: varchar('published_url', { length: 500 }),
  conductedAt: date('conducted_at'),
  topic: varchar('topic', { length: 200 }),
  tags: text('tags').array(),
  /** Soft refs: uuid[] → dna_content_pillars.id */
  contentPillarIds: uuid('content_pillar_ids').array(),
  isPublic: boolean('is_public').notNull().default(true),
  isArchived: boolean('is_archived').notNull().default(false),
  // Embedding of concatenated summary + methodology. Populated async by VEC-01 pipeline.
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('src_own_research_embedding_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
])

export type SrcSourceDocument = typeof srcSourceDocuments.$inferSelect
export type NewSrcSourceDocument = typeof srcSourceDocuments.$inferInsert
export type SrcStatistic = typeof srcStatistics.$inferSelect
export type NewSrcStatistic = typeof srcStatistics.$inferInsert
export type SrcTestimonial = typeof srcTestimonials.$inferSelect
export type NewSrcTestimonial = typeof srcTestimonials.$inferInsert
export type SrcStory = typeof srcStories.$inferSelect
export type NewSrcStory = typeof srcStories.$inferInsert
export type SrcOwnResearch = typeof srcOwnResearch.$inferSelect
export type NewSrcOwnResearch = typeof srcOwnResearch.$inferInsert
