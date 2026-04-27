import { eq, and, count, desc, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { dnaOffers } from '@/lib/db/schema/dna/offers'
import { dnaKnowledgeAssets } from '@/lib/db/schema/dna/knowledge-assets'
import type { OfferSummary, Offer } from '@/lib/types/offers'

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

/** Active + draft + paused offers for switcher and card grid */
export async function listOffers(brandId: string): Promise<OfferSummary[]> {
  return db
    .select({
      id: dnaOffers.id,
      name: dnaOffers.name,
      offerType: dnaOffers.offerType,
      status: dnaOffers.status,
      overview: dnaOffers.overview,
      targetAudienceIds: dnaOffers.targetAudienceIds,
    })
    .from(dnaOffers)
    .where(
      and(
        eq(dnaOffers.brandId, brandId),
        ne(dnaOffers.status, 'retired')
      )
    )
    .orderBy(desc(dnaOffers.createdAt)) as Promise<OfferSummary[]>
}

/** All offers including retired (for card grid toggle) */
export async function listAllOffers(brandId: string): Promise<OfferSummary[]> {
  return db
    .select({
      id: dnaOffers.id,
      name: dnaOffers.name,
      offerType: dnaOffers.offerType,
      status: dnaOffers.status,
      overview: dnaOffers.overview,
      targetAudienceIds: dnaOffers.targetAudienceIds,
    })
    .from(dnaOffers)
    .where(eq(dnaOffers.brandId, brandId))
    .orderBy(desc(dnaOffers.createdAt)) as Promise<OfferSummary[]>
}

// ---------------------------------------------------------------------------
// Get
// ---------------------------------------------------------------------------

export async function getOfferById(id: string): Promise<Offer | null> {
  const rows = await db
    .select()
    .from(dnaOffers)
    .where(eq(dnaOffers.id, id))
    .limit(1)

  if (rows.length === 0) return null

  const row = rows[0]
  return {
    ...row,
    status: row.status as Offer['status'],
    pricing: row.pricing as Offer['pricing'],
    guarantee: row.guarantee as Offer['guarantee'],
    vocMapping: row.vocMapping as Offer['vocMapping'],
    customerJourney: row.customerJourney as Offer['customerJourney'],
  }
}

// ---------------------------------------------------------------------------
// Count
// ---------------------------------------------------------------------------

export async function countActiveOffers(brandId: string): Promise<number> {
  const result = await db
    .select({ value: count() })
    .from(dnaOffers)
    .where(
      and(
        eq(dnaOffers.brandId, brandId),
        eq(dnaOffers.status, 'active')
      )
    )
  return result[0]?.value ?? 0
}

// ---------------------------------------------------------------------------
// Dependents check (for archive guard)
// ---------------------------------------------------------------------------

export async function getOfferDependents(offerId: string): Promise<{ name: string; type: string }[]> {
  // Check knowledge assets that reference this offer via relatedOfferIds array
  const allAssets = await db
    .select({ id: dnaKnowledgeAssets.id, name: dnaKnowledgeAssets.name, relatedOfferIds: dnaKnowledgeAssets.relatedOfferIds })
    .from(dnaKnowledgeAssets)

  const dependents: { name: string; type: string }[] = []

  for (const asset of allAssets) {
    const ids = (asset.relatedOfferIds ?? []) as string[]
    if (ids.includes(offerId)) {
      dependents.push({ name: asset.name, type: 'Knowledge Asset' })
    }
  }

  return dependents
}

// ---------------------------------------------------------------------------
// Update (single field — autosave)
// ---------------------------------------------------------------------------

const ALLOWED_TEXT_FIELDS = new Set([
  'name', 'overview', 'usp', 'uspExplanation', 'cta',
  'scarcity', 'salesFunnelNotes', 'visualPrompt', 'internalNotes',
])

export async function updateOfferField(
  id: string,
  field: string,
  value: string
): Promise<void> {
  if (!ALLOWED_TEXT_FIELDS.has(field)) {
    throw new Error(`updateOfferField: field "${field}" is not allowed`)
  }

  const columnMap: Record<string, string> = {
    name: 'name',
    overview: 'overview',
    usp: 'usp',
    uspExplanation: 'usp_explanation',
    cta: 'cta',
    scarcity: 'scarcity',
    salesFunnelNotes: 'sales_funnel_notes',
    visualPrompt: 'visual_prompt',
    internalNotes: 'internal_notes',
  }

  const column = columnMap[field] ?? field

  await db
    .update(dnaOffers)
    .set({
      [column]: value,
      updatedAt: new Date(),
    } as Record<string, unknown>)
    .where(eq(dnaOffers.id, id))
}

/** Update JSONB fields or scalar non-text fields */
export async function updateOfferJsonField(
  id: string,
  field: string,
  value: unknown
): Promise<void> {
  const columnMap: Record<string, string> = {
    pricing: 'pricing',
    guarantee: 'guarantee',
    vocMapping: 'voc_mapping',
    customerJourney: 'customer_journey',
    targetAudienceIds: 'target_audience_ids',
    knowledgeAssetId: 'knowledge_asset_id',
    offerType: 'offer_type',
    status: 'status',
  }

  const column = columnMap[field]
  if (!column) {
    throw new Error(`updateOfferJsonField: field "${field}" is not allowed`)
  }

  await db
    .update(dnaOffers)
    .set({
      [column]: value,
      updatedAt: new Date(),
    } as Record<string, unknown>)
    .where(eq(dnaOffers.id, id))
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createOffer(
  brandId: string,
  data: {
    name: string
    offerType: string
    status?: string
    targetAudienceIds?: string[]
    vocMapping?: unknown
  }
): Promise<string> {
  const rows = await db
    .insert(dnaOffers)
    .values({
      brandId,
      name: data.name,
      offerType: data.offerType,
      status: data.status ?? 'draft',
      targetAudienceIds: data.targetAudienceIds,
      vocMapping: data.vocMapping,
    })
    .returning({ id: dnaOffers.id })

  return rows[0].id
}

// ---------------------------------------------------------------------------
// Archive / activate
// ---------------------------------------------------------------------------

export async function archiveOffer(id: string): Promise<void> {
  await db
    .update(dnaOffers)
    .set({ status: 'retired', updatedAt: new Date() })
    .where(eq(dnaOffers.id, id))
}

export async function activateOffer(id: string): Promise<void> {
  await db
    .update(dnaOffers)
    .set({ status: 'active', updatedAt: new Date() })
    .where(eq(dnaOffers.id, id))
}

/** Find next non-retired offer to redirect to after archive */
export async function findNextOffer(
  brandId: string,
  excludeId: string
): Promise<string | null> {
  const rows = await db
    .select({ id: dnaOffers.id })
    .from(dnaOffers)
    .where(
      and(
        eq(dnaOffers.brandId, brandId),
        ne(dnaOffers.status, 'retired'),
        ne(dnaOffers.id, excludeId)
      )
    )
    .orderBy(desc(dnaOffers.createdAt))
    .limit(1)

  return rows[0]?.id ?? null
}
