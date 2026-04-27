import { eq, and, ne, asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { dnaAudienceSegments } from '@/lib/db/schema/dna/audience-segments'
import type {
  AudienceSegment,
  AudienceSegmentSummary,
  VocType,
} from '@/lib/types/audience-segments'

/** All non-archived segments for a brand, ordered by sort_order then created_at */
export async function listSegments(brandId: string): Promise<AudienceSegmentSummary[]> {
  const rows = await db
    .select({
      id: dnaAudienceSegments.id,
      segmentName: dnaAudienceSegments.segmentName,
      personaName: dnaAudienceSegments.personaName,
      summary: dnaAudienceSegments.summary,
      avatarUrl: dnaAudienceSegments.avatarUrl,
      status: dnaAudienceSegments.status,
    })
    .from(dnaAudienceSegments)
    .where(
      and(
        eq(dnaAudienceSegments.brandId, brandId),
        ne(dnaAudienceSegments.status, 'archived')
      )
    )
    .orderBy(asc(dnaAudienceSegments.sortOrder), asc(dnaAudienceSegments.createdAt))

  return rows as AudienceSegmentSummary[]
}

/** All segments including archived, for the card grid "show archived" toggle */
export async function listAllSegments(brandId: string): Promise<AudienceSegmentSummary[]> {
  const rows = await db
    .select({
      id: dnaAudienceSegments.id,
      segmentName: dnaAudienceSegments.segmentName,
      personaName: dnaAudienceSegments.personaName,
      summary: dnaAudienceSegments.summary,
      avatarUrl: dnaAudienceSegments.avatarUrl,
      status: dnaAudienceSegments.status,
    })
    .from(dnaAudienceSegments)
    .where(eq(dnaAudienceSegments.brandId, brandId))
    .orderBy(asc(dnaAudienceSegments.sortOrder), asc(dnaAudienceSegments.createdAt))

  return rows as AudienceSegmentSummary[]
}

/** Single segment by ID */
export async function getSegmentById(id: string): Promise<AudienceSegment | null> {
  const rows = await db
    .select()
    .from(dnaAudienceSegments)
    .where(eq(dnaAudienceSegments.id, id))
    .limit(1)

  if (rows.length === 0) return null
  return rows[0] as unknown as AudienceSegment
}

/** Count of active segments for a brand (used for archive guard) */
export async function countActiveSegments(brandId: string): Promise<number> {
  const rows = await db
    .select({ id: dnaAudienceSegments.id })
    .from(dnaAudienceSegments)
    .where(
      and(
        eq(dnaAudienceSegments.brandId, brandId),
        eq(dnaAudienceSegments.status, 'active')
      )
    )
  return rows.length
}

/** Check whether a segment ID is referenced in any dependent tables.
 *  For this build: no dependent tables exist yet (offers, knowledge assets etc are not built).
 *  Returns empty array. Extend when those tables are built. */
export async function getSegmentDependents(
  _segmentId: string
): Promise<{ name: string; type: string }[]> {
  // TODO: query dna_offers, dna_knowledge_assets, dna_content_pillars, dna_lead_magnets
  // for target_audience_ids containing segmentId once those tables are built (DNA-04+)
  return []
}

/** Update a scalar field on a segment. Used by autosave. */
export async function updateSegmentField(
  id: string,
  field: keyof typeof dnaAudienceSegments.$inferSelect,
  value: unknown
): Promise<void> {
  await db
    .update(dnaAudienceSegments)
    .set({ [field]: value, updatedAt: new Date() })
    .where(eq(dnaAudienceSegments.id, id))
}

/** Replace a full JSONB VOC column (problems, desires, objections, shared_beliefs) */
export async function updateSegmentVoc(
  id: string,
  vocType: VocType,
  items: unknown[]
): Promise<void> {
  await db
    .update(dnaAudienceSegments)
    .set({ [vocType]: items, updatedAt: new Date() })
    .where(eq(dnaAudienceSegments.id, id))
}

/** Archive a segment */
export async function archiveSegment(id: string): Promise<void> {
  await db
    .update(dnaAudienceSegments)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(eq(dnaAudienceSegments.id, id))
}

/** Promote a draft segment to active */
export async function activateSegment(id: string): Promise<void> {
  await db
    .update(dnaAudienceSegments)
    .set({ status: 'active', updatedAt: new Date() })
    .where(eq(dnaAudienceSegments.id, id))
}
