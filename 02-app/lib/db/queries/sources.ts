import { eq, and, count, desc, sql, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { srcSourceDocuments } from '@/lib/db/schema/source'

/** Count of sources with inbox_status = 'new' */
export async function getInboxCount(brandId: string): Promise<number> {
  const result = await db
    .select({ value: count() })
    .from(srcSourceDocuments)
    .where(and(eq(srcSourceDocuments.brandId, brandId), eq(srcSourceDocuments.inboxStatus, 'new')))
  return result[0]?.value ?? 0
}

export interface SourceFilters {
  inboxOnly?: boolean
  type?: string
  tags?: string[]
  search?: string
}

/** Filterable list of source documents, ordered by document_date DESC */
export async function getSourceDocuments(brandId: string, filters?: SourceFilters) {
  const conditions = [eq(srcSourceDocuments.brandId, brandId)]

  if (filters?.inboxOnly) {
    conditions.push(eq(srcSourceDocuments.inboxStatus, 'new'))
  }
  if (filters?.type) {
    conditions.push(eq(srcSourceDocuments.type, filters.type))
  }
  if (filters?.search) {
    conditions.push(sql`${srcSourceDocuments.title} ILIKE ${'%' + filters.search + '%'}`)
  }
  if (filters?.tags && filters.tags.length > 0) {
    // Source must have ALL specified tags
    for (const tag of filters.tags) {
      conditions.push(sql`${tag} = ANY(${srcSourceDocuments.tags})`)
    }
  }

  return db
    .select({
      id: srcSourceDocuments.id,
      title: srcSourceDocuments.title,
      type: srcSourceDocuments.type,
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

/** Fetch multiple sources by ID */
export async function getSourcesByIds(ids: string[]) {
  if (ids.length === 0) return []
  return db
    .select()
    .from(srcSourceDocuments)
    .where(inArray(srcSourceDocuments.id, ids))
}

/** Mark sources as triaged (removes from inbox view) */
export async function markSourcesTriaged(ids: string[]) {
  if (ids.length === 0) return
  await db
    .update(srcSourceDocuments)
    .set({ inboxStatus: 'triaged', updatedAt: new Date() })
    .where(inArray(srcSourceDocuments.id, ids))
}

/** Append a processing run entry to a source's processing_history */
export async function updateSourceProcessingHistory(
  sourceId: string,
  entry: { date: string; mode: string; runId: string }
) {
  await db
    .update(srcSourceDocuments)
    .set({
      processingHistory: sql`${srcSourceDocuments.processingHistory} || ${JSON.stringify([entry])}::jsonb`,
      updatedAt: new Date(),
    })
    .where(eq(srcSourceDocuments.id, sourceId))
}
