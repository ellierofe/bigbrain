import { eq, and, count, desc, sql, inArray, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { srcSourceDocuments } from '@/lib/db/schema/source'
import { srcSourceChunks } from '@/lib/db/schema/source-chunks'
import { lensReports } from '@/lib/db/schema/lens-reports'
import { graphNodes } from '@/lib/db/schema/graph'
import type {
  SourceListRowData,
  SourceDetailData,
  SourceListFilters,
  ChunkRowData,
  LinkedLensReportSummary,
  PersonSummary,
  ProcessingHistoryEntry,
} from '@/lib/types/source-list'
import type { SourceType, Authority, LensId } from '@/lib/types/lens'

// ---------------------------------------------------------------------------
// Sources queries (INP-12 Pass 1).
// Reads + writes for src_source_documents + child chunks + linked lens reports.
// Person mirror lookups via graph_nodes (label='Person').
// ---------------------------------------------------------------------------

const SUMMARY_PREVIEW_LEN = 140

/** Count of sources with inbox_status = 'new' */
export async function getInboxCount(brandId: string): Promise<number> {
  const result = await db
    .select({ value: count() })
    .from(srcSourceDocuments)
    .where(and(eq(srcSourceDocuments.brandId, brandId), eq(srcSourceDocuments.inboxStatus, 'new')))
  return result[0]?.value ?? 0
}

// ---------------------------------------------------------------------------
// Legacy compatibility shim — kept because DNA-05 / DNA-04 generation routes
// and the SourceDocPicker / SourceMaterialsTable / AddSamplesModal molecules
// still query through this helper. INP-12 Pass 1 consumes listSources instead.
// ---------------------------------------------------------------------------
export interface SourceFilters {
  inboxOnly?: boolean
  type?: string
  tags?: string[]
  search?: string
}

export async function getSourceDocuments(brandId: string, filters?: SourceFilters) {
  const conditions = [eq(srcSourceDocuments.brandId, brandId)]
  if (filters?.inboxOnly) conditions.push(eq(srcSourceDocuments.inboxStatus, 'new'))
  if (filters?.type) conditions.push(eq(srcSourceDocuments.sourceType, filters.type))
  if (filters?.search) {
    conditions.push(sql`${srcSourceDocuments.title} ILIKE ${'%' + filters.search + '%'}`)
  }
  if (filters?.tags && filters.tags.length > 0) {
    for (const tag of filters.tags) {
      conditions.push(sql`${tag} = ANY(${srcSourceDocuments.tags})`)
    }
  }
  return db
    .select({
      id: srcSourceDocuments.id,
      title: srcSourceDocuments.title,
      type: srcSourceDocuments.sourceType,
      extractedText: srcSourceDocuments.extractedText,
      tags: srcSourceDocuments.tags,
      documentDate: srcSourceDocuments.documentDate,
      inboxStatus: srcSourceDocuments.inboxStatus,
      processingHistory: srcSourceDocuments.processingHistory,
      participantIds: srcSourceDocuments.participantIds,
      krispMeetingId: srcSourceDocuments.krispMeetingId,
      createdAt: srcSourceDocuments.createdAt,
    })
    .from(srcSourceDocuments)
    .where(and(...conditions))
    .orderBy(desc(srcSourceDocuments.documentDate))
}

/** Fetch multiple sources by ID (raw rows — used by DNA generation routes). */
export async function getSourcesByIds(ids: string[]) {
  if (ids.length === 0) return []
  return db.select().from(srcSourceDocuments).where(inArray(srcSourceDocuments.id, ids))
}

// ---------------------------------------------------------------------------
// listSources — Pass 1 list-row projection
// ---------------------------------------------------------------------------

export async function listSources(brandId: string, filters?: SourceListFilters): Promise<SourceListRowData[]> {
  const conditions = [eq(srcSourceDocuments.brandId, brandId)]

  if (filters?.inboxStatus && filters.inboxStatus !== 'all') {
    conditions.push(eq(srcSourceDocuments.inboxStatus, filters.inboxStatus))
  }
  if (filters?.sourceType) {
    conditions.push(eq(srcSourceDocuments.sourceType, filters.sourceType))
  }
  if (filters?.authority) {
    conditions.push(eq(srcSourceDocuments.authority, filters.authority))
  }
  if (filters?.search) {
    const q = `%${filters.search}%`
    const search = or(
      sql`${srcSourceDocuments.title} ILIKE ${q}`,
      sql`${srcSourceDocuments.summary} ILIKE ${q}`,
      sql`EXISTS (SELECT 1 FROM unnest(${srcSourceDocuments.tags}) AS t WHERE t ILIKE ${q})`,
    )
    if (search) conditions.push(search)
  }
  if (filters?.tags && filters.tags.length > 0) {
    for (const tag of filters.tags) {
      conditions.push(sql`${tag} = ANY(${srcSourceDocuments.tags})`)
    }
  }

  const rows = await db
    .select({
      id: srcSourceDocuments.id,
      title: srcSourceDocuments.title,
      sourceType: srcSourceDocuments.sourceType,
      authority: srcSourceDocuments.authority,
      chunkCount: srcSourceDocuments.chunkCount,
      tags: srcSourceDocuments.tags,
      inboxStatus: srcSourceDocuments.inboxStatus,
      processingHistory: srcSourceDocuments.processingHistory,
      documentDate: srcSourceDocuments.documentDate,
      createdAt: srcSourceDocuments.createdAt,
      summary: srcSourceDocuments.summary,
      extractedTextLength: sql<number>`COALESCE(LENGTH(${srcSourceDocuments.extractedText}), 0)`,
    })
    .from(srcSourceDocuments)
    .where(and(...conditions))
    .orderBy(desc(srcSourceDocuments.createdAt))

  return rows.map((r) => {
    const sourceType = r.sourceType as SourceType
    const hasText = (r.extractedTextLength ?? 0) > 0
    let ingestStatus: SourceListRowData['ingestStatus']
    if (sourceType === 'dataset' || sourceType === 'collection') {
      ingestStatus = 'skipped'
    } else if (!hasText) {
      ingestStatus = 'awaiting-text'
    } else if (r.chunkCount === 0 || !r.summary) {
      ingestStatus = 'processing'
    } else {
      ingestStatus = 'ready'
    }
    return {
      id: r.id,
      title: r.title,
      sourceType,
      authority: r.authority as Authority,
      chunkCount: r.chunkCount,
      tags: r.tags ?? [],
      inboxStatus: (r.inboxStatus as 'new' | 'triaged' | null) ?? null,
      processingHistoryCount: Array.isArray(r.processingHistory) ? r.processingHistory.length : 0,
      documentDate: r.documentDate,
      createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
      summaryPreview: r.summary ? r.summary.slice(0, SUMMARY_PREVIEW_LEN) : null,
      ingestStatus,
    }
  })
}

// ---------------------------------------------------------------------------
// Source detail
// ---------------------------------------------------------------------------

export async function getSourceDetail(brandId: string, id: string): Promise<SourceDetailData | null> {
  const rows = await db
    .select()
    .from(srcSourceDocuments)
    .where(and(eq(srcSourceDocuments.brandId, brandId), eq(srcSourceDocuments.id, id)))
    .limit(1)
  const r = rows[0]
  if (!r) return null

  return {
    id: r.id,
    brandId: r.brandId,
    title: r.title,
    sourceType: r.sourceType as SourceType,
    authority: r.authority as Authority,
    description: r.description,
    summary: r.summary,
    summaryGeneratedAt: r.summaryGeneratedAt?.toISOString() ?? null,
    chunkCount: r.chunkCount,
    tags: r.tags ?? [],
    participantIds: r.participantIds ?? [],
    inboxStatus: (r.inboxStatus as 'new' | 'triaged' | null) ?? null,
    processingHistory: normaliseHistory(r.processingHistory),
    documentDate: r.documentDate,
    krispMeetingId: r.krispMeetingId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    extractedTextLength: r.extractedText?.length ?? 0,
  }
}

function normaliseHistory(raw: unknown): ProcessingHistoryEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((e): ProcessingHistoryEntry | null => {
      if (!e || typeof e !== 'object') return null
      const obj = e as Record<string, unknown>
      const lens = (obj.lens ?? obj.mode) as LensId | undefined
      const processingRunId = (obj.processingRunId ?? obj.runId) as string | undefined
      const date = obj.date as string | undefined
      if (!lens || !processingRunId || !date) return null
      return {
        date,
        lens,
        processingRunId,
        lensReportId: obj.lensReportId as string | undefined,
        status: (obj.status as ProcessingHistoryEntry['status']) ?? 'committed',
        itemCount: typeof obj.itemCount === 'number' ? obj.itemCount : undefined,
        errorMessage: obj.errorMessage as string | undefined,
      }
    })
    .filter((e): e is ProcessingHistoryEntry => e !== null)
}

// ---------------------------------------------------------------------------
// Chunks
// ---------------------------------------------------------------------------

export async function getChunksForSource(sourceId: string, limit?: number): Promise<ChunkRowData[]> {
  const baseQuery = db
    .select({
      id: srcSourceChunks.id,
      position: srcSourceChunks.position,
      chunkType: srcSourceChunks.chunkType,
      text: srcSourceChunks.text,
      speaker: srcSourceChunks.speaker,
      metadata: srcSourceChunks.metadata,
    })
    .from(srcSourceChunks)
    .where(eq(srcSourceChunks.sourceDocumentId, sourceId))
    .orderBy(srcSourceChunks.position)

  const rows = limit ? await baseQuery.limit(limit) : await baseQuery

  return rows.map((r) => ({
    id: r.id,
    position: r.position,
    chunkType: r.chunkType as ChunkRowData['chunkType'],
    text: r.text,
    speaker: r.speaker,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
  }))
}

// ---------------------------------------------------------------------------
// Linked lens reports — reports drawing on this source via sourceIds @> [id]
// ---------------------------------------------------------------------------

export async function getLinkedLensReports(sourceId: string): Promise<LinkedLensReportSummary[]> {
  const rows = await db
    .select({
      id: lensReports.id,
      lens: lensReports.lens,
      title: lensReports.title,
      summary: lensReports.summary,
      status: lensReports.status,
      committedAt: lensReports.committedAt,
      committedItemCount: lensReports.committedItemCount,
      supersededById: lensReports.supersededById,
    })
    .from(lensReports)
    .where(sql`${lensReports.sourceIds} @> ARRAY[${sourceId}]::uuid[]`)
    .orderBy(desc(lensReports.committedAt))

  return rows.map((r) => ({
    id: r.id,
    lens: r.lens as LensId,
    title: r.title,
    summary: r.summary,
    status: r.status as 'draft' | 'committed' | 'superseded',
    committedAt: r.committedAt?.toISOString() ?? null,
    committedItemCount: r.committedItemCount,
    supersededById: r.supersededById,
  }))
}

// ---------------------------------------------------------------------------
// Person mirror lookups (graph_nodes.label='Person')
// ---------------------------------------------------------------------------

export async function getPeopleByIds(ids: string[]): Promise<PersonSummary[]> {
  if (ids.length === 0) return []
  const rows = await db
    .select({
      id: graphNodes.id,
      name: graphNodes.name,
      properties: graphNodes.properties,
    })
    .from(graphNodes)
    .where(and(eq(graphNodes.label, 'Person'), inArray(graphNodes.id, ids)))

  return rows.map((r) => projectPerson(r.id, r.name, r.properties))
}

export async function searchPeople(query: string, limit = 8): Promise<PersonSummary[]> {
  const trimmed = query.trim()
  if (!trimmed) return []
  // ILIKE on both label and name so we match Person / person / Politician (etc)
  // robustly while data sources still vary in casing/labels.
  const rows = await db
    .select({
      id: graphNodes.id,
      name: graphNodes.name,
      properties: graphNodes.properties,
    })
    .from(graphNodes)
    .where(
      and(
        sql`${graphNodes.label} ILIKE 'person'`,
        sql`${graphNodes.name} ILIKE ${'%' + trimmed + '%'}`,
      ),
    )
    .limit(limit)

  return rows.map((r) => projectPerson(r.id, r.name, r.properties))
}

function projectPerson(id: string, name: string, properties: unknown): PersonSummary {
  const props = (properties as Record<string, unknown>) ?? {}
  return {
    id,
    name,
    role: typeof props.role === 'string' ? props.role : undefined,
    org: typeof props.org === 'string' ? props.org : undefined,
  }
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export interface SourceFieldPatch {
  title?: string
  sourceType?: SourceType
  authority?: Authority
  description?: string | null
  tags?: string[]
  participantIds?: string[]
  documentDate?: string | null
}

export async function updateSourceFields(id: string, patch: SourceFieldPatch): Promise<void> {
  const set: Record<string, unknown> = { updatedAt: new Date() }
  if (patch.title !== undefined) set.title = patch.title
  if (patch.sourceType !== undefined) set.sourceType = patch.sourceType
  if (patch.authority !== undefined) set.authority = patch.authority
  if (patch.description !== undefined) set.description = patch.description
  if (patch.tags !== undefined) set.tags = patch.tags
  if (patch.participantIds !== undefined) set.participantIds = patch.participantIds
  if (patch.documentDate !== undefined) set.documentDate = patch.documentDate
  await db.update(srcSourceDocuments).set(set).where(eq(srcSourceDocuments.id, id))
}

/** Bulk triage commit. Optional per-id patches let the bulk-triage modal apply
 *  source-type / authority / tags / participants alongside the inboxStatus flip. */
export async function triageSources(
  ids: string[],
  patches?: Record<string, SourceFieldPatch>,
): Promise<void> {
  if (ids.length === 0) return
  // Per-id patches first (each one is small and independent)
  if (patches) {
    for (const id of ids) {
      const p = patches[id]
      if (p) await updateSourceFields(id, p)
    }
  }
  // Single bulk inbox-status flip
  await db
    .update(srcSourceDocuments)
    .set({ inboxStatus: 'triaged', updatedAt: new Date() })
    .where(inArray(srcSourceDocuments.id, ids))
}

export async function markSingleTriaged(id: string): Promise<void> {
  await db
    .update(srcSourceDocuments)
    .set({ inboxStatus: 'triaged', updatedAt: new Date() })
    .where(eq(srcSourceDocuments.id, id))
}

export async function deleteSource(id: string): Promise<void> {
  await db.delete(srcSourceDocuments).where(eq(srcSourceDocuments.id, id))
}

/** Park a Person as unresolved in the graph_nodes mirror. Used by ParticipantsPicker.
 *  Pass 1 scope: bare row in graph_nodes — properties.relationship_types=['unresolved'].
 *  FalkorDB write is deferred to Pass 2's canonical-resolution flow (when contact-card
 *  modal lands). Returns the synthesised id used in graph_nodes.id. */
export async function parkPersonAsUnresolved(name: string): Promise<{ id: string; name: string }> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('parkPersonAsUnresolved: name is empty')

  // graph_nodes.id is a varchar(100) — use a uuid prefixed for visibility.
  const id = `unresolved-${crypto.randomUUID()}`
  await db.insert(graphNodes).values({
    id,
    label: 'Person',
    name: trimmed,
    properties: { relationship_types: ['unresolved'] },
    source: 'INP-12 Pass 1 — parked unresolved',
  })
  return { id, name: trimmed }
}
