import type { LensId, SourceType, Authority } from '@/lib/types/lens'

// ---------------------------------------------------------------------------
// Client-safe projections from src_source_documents + related rows (INP-12 Pass 1).
// Surfaces in app/(dashboard)/inputs/sources consume these — never the raw
// Drizzle row types — so the client bundle stays free of schema metadata.
// ---------------------------------------------------------------------------

export interface SourceListRowData {
  id: string
  title: string
  sourceType: SourceType
  authority: Authority
  chunkCount: number
  tags: string[]
  inboxStatus: 'new' | 'triaged' | null
  processingHistoryCount: number
  documentDate: string | null
  createdAt: string
  /** First ~140 chars of `summary` for the list row teaser. Null when summary is still generating. */
  summaryPreview: string | null
  /** Derived ingest state for the row badge:
   *  - 'awaiting-text'   — no extracted_text yet (uploaded but INP-05 hasn't extracted it)
   *  - 'processing'      — text exists, chunks/summary still generating
   *  - 'ready'           — chunks + summary populated
   *  - 'skipped'         — dataset/collection (chunks intentionally absent)
   */
  ingestStatus: 'awaiting-text' | 'processing' | 'ready' | 'skipped'
}

export interface SourceDetailData {
  id: string
  brandId: string
  title: string
  sourceType: SourceType
  authority: Authority
  description: string | null
  summary: string | null
  summaryGeneratedAt: string | null
  chunkCount: number
  tags: string[]
  participantIds: string[]
  inboxStatus: 'new' | 'triaged' | null
  processingHistory: ProcessingHistoryEntry[]
  documentDate: string | null
  krispMeetingId: string | null
  createdAt: string
  updatedAt: string
  /** extractedText length (used to drive "no text yet" warnings); never the body itself in the client. */
  extractedTextLength: number
}

export interface ProcessingHistoryEntry {
  date: string
  lens: LensId
  processingRunId: string
  lensReportId?: string
  status: 'pending' | 'committed' | 'failed'
  itemCount?: number
  errorMessage?: string
}

export interface ChunkRowData {
  id: string
  position: number
  chunkType: 'speaker-turn' | 'paragraph' | 'section' | 'slide' | 'row' | 'item'
  text: string
  speaker: string | null
  metadata: Record<string, unknown>
}

export interface LinkedLensReportSummary {
  id: string
  lens: LensId
  title: string
  summary: string | null
  status: 'draft' | 'committed' | 'superseded'
  committedAt: string | null
  committedItemCount: number
  supersededById: string | null
}

export interface PersonSummary {
  id: string
  name: string
  role?: string
  org?: string
}

export interface SourceListFilters {
  inboxStatus?: 'new' | 'triaged' | 'all'
  sourceType?: SourceType
  authority?: Authority
  tags?: string[]
  search?: string
}
