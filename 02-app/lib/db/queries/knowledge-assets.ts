import { eq, and, count, desc, ne, sql, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { dnaKnowledgeAssets } from '@/lib/db/schema/dna/knowledge-assets'
import { dnaOffers } from '@/lib/db/schema/dna/offers'
import type { KnowledgeAssetSummary, KnowledgeAsset } from '@/lib/types/knowledge-assets'

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

/** Active + draft assets for switcher and card grid */
export async function listAssets(brandId: string): Promise<KnowledgeAssetSummary[]> {
  return db
    .select({
      id: dnaKnowledgeAssets.id,
      name: dnaKnowledgeAssets.name,
      kind: dnaKnowledgeAssets.kind,
      proprietary: dnaKnowledgeAssets.proprietary,
      status: dnaKnowledgeAssets.status,
      summary: dnaKnowledgeAssets.summary,
    })
    .from(dnaKnowledgeAssets)
    .where(
      and(
        eq(dnaKnowledgeAssets.brandId, brandId),
        ne(dnaKnowledgeAssets.status, 'archived')
      )
    )
    .orderBy(desc(dnaKnowledgeAssets.createdAt)) as Promise<KnowledgeAssetSummary[]>
}

/** All assets including archived (for card grid toggle) */
export async function listAllAssets(brandId: string): Promise<KnowledgeAssetSummary[]> {
  return db
    .select({
      id: dnaKnowledgeAssets.id,
      name: dnaKnowledgeAssets.name,
      kind: dnaKnowledgeAssets.kind,
      proprietary: dnaKnowledgeAssets.proprietary,
      status: dnaKnowledgeAssets.status,
      summary: dnaKnowledgeAssets.summary,
    })
    .from(dnaKnowledgeAssets)
    .where(eq(dnaKnowledgeAssets.brandId, brandId))
    .orderBy(desc(dnaKnowledgeAssets.createdAt)) as Promise<KnowledgeAssetSummary[]>
}

// ---------------------------------------------------------------------------
// Get
// ---------------------------------------------------------------------------

export async function getAssetById(id: string): Promise<KnowledgeAsset | null> {
  const rows = await db
    .select()
    .from(dnaKnowledgeAssets)
    .where(eq(dnaKnowledgeAssets.id, id))
    .limit(1)

  if (rows.length === 0) return null

  const row = rows[0]
  return {
    ...row,
    kind: row.kind as KnowledgeAsset['kind'],
    status: row.status as KnowledgeAsset['status'],
    keyComponents: (row.keyComponents ?? []) as KnowledgeAsset['keyComponents'],
    flow: (row.flow ?? []) as KnowledgeAsset['flow'],
    faqs: (row.faqs ?? []) as KnowledgeAsset['faqs'],
    detail: row.detail as KnowledgeAsset['detail'],
    vocMapping: row.vocMapping as KnowledgeAsset['vocMapping'],
  }
}

// ---------------------------------------------------------------------------
// Count
// ---------------------------------------------------------------------------

export async function countActiveAssets(brandId: string): Promise<number> {
  const result = await db
    .select({ value: count() })
    .from(dnaKnowledgeAssets)
    .where(
      and(
        eq(dnaKnowledgeAssets.brandId, brandId),
        eq(dnaKnowledgeAssets.status, 'active')
      )
    )
  return result[0]?.value ?? 0
}

// ---------------------------------------------------------------------------
// Dependents check (for archive guard)
// ---------------------------------------------------------------------------

export async function getAssetDependents(assetId: string): Promise<{ name: string; type: string }[]> {
  // Check offers that reference this asset via FK
  const offersByFk = await db
    .select({ name: dnaOffers.name })
    .from(dnaOffers)
    .where(eq(dnaOffers.knowledgeAssetId, assetId))

  const dependents: { name: string; type: string }[] = offersByFk.map(o => ({
    name: o.name,
    type: 'Offer',
  }))

  return dependents
}

// ---------------------------------------------------------------------------
// Update (single field — autosave)
// ---------------------------------------------------------------------------

const ALLOWED_TEXT_FIELDS = new Set([
  'name', 'summary', 'principles', 'origin', 'objectives',
  'problemsSolved', 'contexts', 'priorKnowledge', 'resources',
])

export async function updateAssetField(
  id: string,
  field: string,
  value: string
): Promise<void> {
  if (!ALLOWED_TEXT_FIELDS.has(field)) {
    throw new Error(`updateAssetField: field "${field}" is not allowed`)
  }

  // Map camelCase to snake_case for DB
  const columnMap: Record<string, string> = {
    name: 'name',
    summary: 'summary',
    principles: 'principles',
    origin: 'origin',
    objectives: 'objectives',
    problemsSolved: 'problems_solved',
    contexts: 'contexts',
    priorKnowledge: 'prior_knowledge',
    resources: 'resources',
  }

  const column = columnMap[field] ?? field

  await db
    .update(dnaKnowledgeAssets)
    .set({
      [column]: value,
      updatedAt: new Date(),
    } as Record<string, unknown>)
    .where(eq(dnaKnowledgeAssets.id, id))
}

/** Update JSONB fields (detail, keyComponents, flow, faqs, vocMapping) or scalar non-text fields */
export async function updateAssetJsonField(
  id: string,
  field: string,
  value: unknown
): Promise<void> {
  const columnMap: Record<string, string> = {
    detail: 'detail',
    keyComponents: 'key_components',
    flow: 'flow',
    faqs: 'faqs',
    vocMapping: 'voc_mapping',
    sourceDocumentIds: 'source_document_ids',
    targetAudienceIds: 'target_audience_ids',
    relatedOfferIds: 'related_offer_ids',
    kind: 'kind',
    proprietary: 'proprietary',
    status: 'status',
    graphNodeId: 'graph_node_id',
  }

  const column = columnMap[field]
  if (!column) {
    throw new Error(`updateAssetJsonField: field "${field}" is not allowed`)
  }

  await db
    .update(dnaKnowledgeAssets)
    .set({
      [column]: value,
      updatedAt: new Date(),
    } as Record<string, unknown>)
    .where(eq(dnaKnowledgeAssets.id, id))
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createAsset(
  brandId: string,
  data: {
    name: string
    kind: string
    status?: string
    proprietary?: boolean
    targetAudienceIds?: string[]
    sourceDocumentIds?: string[]
    vocMapping?: unknown
  }
): Promise<string> {
  const rows = await db
    .insert(dnaKnowledgeAssets)
    .values({
      brandId,
      name: data.name,
      kind: data.kind,
      status: data.status ?? 'draft',
      proprietary: data.proprietary ?? true,
      targetAudienceIds: data.targetAudienceIds,
      sourceDocumentIds: data.sourceDocumentIds,
      vocMapping: data.vocMapping,
    })
    .returning({ id: dnaKnowledgeAssets.id })

  return rows[0].id
}

// ---------------------------------------------------------------------------
// Archive / activate
// ---------------------------------------------------------------------------

export async function archiveAsset(id: string): Promise<void> {
  await db
    .update(dnaKnowledgeAssets)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(eq(dnaKnowledgeAssets.id, id))
}

export async function activateAsset(id: string): Promise<void> {
  await db
    .update(dnaKnowledgeAssets)
    .set({ status: 'active', updatedAt: new Date() })
    .where(eq(dnaKnowledgeAssets.id, id))
}

/** Find next non-archived asset to redirect to after archive */
export async function findNextAsset(
  brandId: string,
  excludeId: string
): Promise<string | null> {
  const rows = await db
    .select({ id: dnaKnowledgeAssets.id })
    .from(dnaKnowledgeAssets)
    .where(
      and(
        eq(dnaKnowledgeAssets.brandId, brandId),
        ne(dnaKnowledgeAssets.status, 'archived'),
        ne(dnaKnowledgeAssets.id, excludeId)
      )
    )
    .orderBy(desc(dnaKnowledgeAssets.createdAt))
    .limit(1)

  return rows[0]?.id ?? null
}
