import { index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { brands } from './brands'
import { srcSourceDocuments } from './source'
import { vector } from './types'

// ---------------------------------------------------------------------------
// src_source_chunks — semantic chunks of source documents (INP-12)
// One row per chunk: speaker-turn for transcripts, paragraph for documents,
// slide for pitch decks. Each chunk has its own embedding for passage-grain
// retrieval. Mirrored as SourceChunk graph nodes (per ADR-002a).
// Immutable: re-chunking deletes + recreates the whole set, never edits in place.
// ---------------------------------------------------------------------------
export const srcSourceChunks = pgTable('src_source_chunks', {
  /** Same UUID is used as the SourceChunk graph node id (matches src_source_documents pattern). */
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  sourceDocumentId: uuid('source_document_id').notNull().references(() => srcSourceDocuments.id, { onDelete: 'cascade' }),

  /** Ordinal within parent source, starting at 0. Stable across re-chunks. */
  position: integer('position').notNull(),

  /** 'speaker-turn' | 'paragraph' | 'section' | 'slide' | 'row' | 'item' */
  chunkType: varchar('chunk_type', { length: 20 }).notNull(),

  /** Verbatim chunk content. Not paraphrased, not summarised. */
  text: text('text').notNull(),

  /** Speaker name for speaker-turn chunks. Free-form here; canonical Person resolution at processing time. */
  speaker: varchar('speaker', { length: 200 }),

  /** Char offsets into parent's extracted_text. Null when offsets can't be determined. */
  startOffset: integer('start_offset'),
  endOffset: integer('end_offset'),

  /** Approximate token count for retrieval budgeting. */
  tokenCount: integer('token_count'),

  /** Chunk-type-specific properties: { slideNumber, slideTitle, sectionHeading, ... } */
  metadata: jsonb('metadata').notNull().default({}),

  /** OpenAI text-embedding-3-small. Nullable so chunks can be inserted before embedding completes. */
  embedding: vector('embedding', { dimensions: 1536 }),
  embeddingGeneratedAt: timestamp('embedding_generated_at', { withTimezone: true }),

  /** Forward-compat for INP-05 (multi-modal document ingestion).
   *  Vercel Blob URLs of image attachments — diagrams, slide images, embedded figures.
   *  Populated by INP-05 when document ingestion lands; null for text-only chunks. */
  imageRefs: text('image_refs').array(),

  /** Forward-compat for INP-05. Vision-LLM-generated description of the chunk's visual content.
   *  For pitch-deck slides without text, this becomes the chunk's effective text content for embedding. */
  imageDescription: text('image_description'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('src_source_chunks_embedding_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
  index('src_source_chunks_source_position_idx').on(t.sourceDocumentId, t.position),
  index('src_source_chunks_brand_source_idx').on(t.brandId, t.sourceDocumentId),
])

export type SrcSourceChunk = typeof srcSourceChunks.$inferSelect
export type NewSrcSourceChunk = typeof srcSourceChunks.$inferInsert
