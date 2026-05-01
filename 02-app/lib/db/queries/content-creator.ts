/**
 * Read-side queries for the content-creator picker + generation surface (OUT-02-P4a).
 * Write-side flows live in `app/actions/content-creator.ts`.
 */

import { and, asc, eq, ne, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contentTypes, type ContentType } from '@/lib/db/schema/content/content-types'
import { brandContentTypeFavourites } from '@/lib/db/schema/content/brand-content-type-favourites'
import { aiModels, type AiModel } from '@/lib/db/schema/content/ai-models'
import { dnaAudienceSegments } from '@/lib/db/schema/dna/audience-segments'
import { dnaOffers } from '@/lib/db/schema/dna/offers'
import { dnaKnowledgeAssets } from '@/lib/db/schema/dna/knowledge-assets'
import { dnaPlatforms } from '@/lib/db/schema/dna/platforms'
import { dnaTovApplications } from '@/lib/db/schema/dna/tone-of-voice'
import type { Prerequisites } from '@/lib/llm/content/types'

// ---------------------------------------------------------------------------
// Content type catalogue (with locked-state computation)
// ---------------------------------------------------------------------------

export type ContentTypeCardData = {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string | null
  pickerGroup: string
  platformType: string
  formatType: string
  isFavourite: boolean
  isLocked: boolean
  /** When locked, describes the first missing prereq (e.g. "an Offer") + deeplink. */
  missingPrereq: { label: string; href: string } | null
}

const PREREQ_DEEPLINKS: Record<string, { label: (item: string) => string; href: string }> = {
  offer: { label: () => 'an Offer', href: '/dna/offers' },
  audience_segment: { label: () => 'an Audience Segment', href: '/dna/audience-segments' },
  knowledge_asset: { label: () => 'a Knowledge Asset', href: '/dna/knowledge-assets' },
  brand_intro: { label: () => 'a Brand Intro', href: '/dna' },
  tone_of_voice: { label: () => 'a Tone of Voice', href: '/dna/tone-of-voice' },
  business_overview: { label: () => 'a Business Overview', href: '/dna' },
  brand_meaning: { label: () => 'a Brand Meaning', href: '/dna/brand-meaning' },
  value_proposition: { label: () => 'a Value Proposition', href: '/dna/value-proposition' },
}

/**
 * Lists all `is_active` content types for the picker, with per-row favourite
 * + locked-state flags resolved against live DNA.
 */
export async function listPickerContentTypes(brandId: string): Promise<ContentTypeCardData[]> {
  const rows = await db
    .select({
      contentType: contentTypes,
      isFavourite: sql<boolean>`(${brandContentTypeFavourites.brandId} IS NOT NULL)`,
    })
    .from(contentTypes)
    .leftJoin(
      brandContentTypeFavourites,
      and(
        eq(brandContentTypeFavourites.contentTypeId, contentTypes.id),
        eq(brandContentTypeFavourites.brandId, brandId),
      ),
    )
    .where(ne(contentTypes.status, 'archived'))
    .orderBy(asc(contentTypes.pickerGroup), asc(contentTypes.name))

  // Resolve locks against live DNA. For V1 with 3 content types and small
  // prerequisites arrays, a small N+1 here is fine. If prereqs grow, batch.
  const result: ContentTypeCardData[] = []
  for (const row of rows) {
    const ct = row.contentType
    const prereqs = ct.prerequisites as Prerequisites
    const missing = await resolveFirstMissingPrereq(brandId, prereqs)
    result.push({
      id: ct.id,
      slug: ct.slug,
      name: ct.name,
      description: ct.description,
      icon: ct.icon,
      pickerGroup: ct.pickerGroup,
      platformType: ct.platformType,
      formatType: ct.formatType,
      isFavourite: row.isFavourite,
      isLocked: missing !== null,
      missingPrereq: missing,
    })
  }

  return result
}

async function resolveFirstMissingPrereq(
  brandId: string,
  prereqs: Prerequisites,
): Promise<{ label: string; href: string } | null> {
  // dna prereqs (e.g. ['offer'], ['audience_segment'], ['tone_of_voice'])
  for (const dnaKey of prereqs.dna ?? []) {
    const ok = await checkDnaPrereq(brandId, dnaKey)
    if (!ok) {
      const meta = PREREQ_DEEPLINKS[dnaKey] ?? { label: () => dnaKey, href: '/dna' }
      return { label: meta.label(dnaKey), href: meta.href }
    }
  }
  // channels (e.g. ['newsletter']) — checked against dna_platforms WHERE channel = X AND is_active
  for (const channel of prereqs.channels ?? []) {
    const rows = await db
      .select({ id: dnaPlatforms.id })
      .from(dnaPlatforms)
      .where(and(eq(dnaPlatforms.brandId, brandId), eq(dnaPlatforms.channel, channel), eq(dnaPlatforms.isActive, true)))
      .limit(1)
    if (rows.length === 0) {
      return { label: `a ${channel.replace(/_/g, ' ')} channel`, href: '/dna/platforms' }
    }
  }
  // lead_magnets — DNA-08 not built yet; if the array has values, we cannot satisfy.
  // Until DNA-08 lands, treat as a prereq miss with a placeholder href.
  if ((prereqs.lead_magnets ?? []).length > 0) {
    return { label: 'a Lead Magnet (coming soon)', href: '/dna' }
  }
  return null
}

async function checkDnaPrereq(brandId: string, dnaKey: string): Promise<boolean> {
  switch (dnaKey) {
    case 'offer': {
      const r = await db.select({ id: dnaOffers.id }).from(dnaOffers)
        .where(and(eq(dnaOffers.brandId, brandId), eq(dnaOffers.status, 'active'))).limit(1)
      return r.length > 0
    }
    case 'audience_segment': {
      const r = await db.select({ id: dnaAudienceSegments.id }).from(dnaAudienceSegments)
        .where(and(eq(dnaAudienceSegments.brandId, brandId), eq(dnaAudienceSegments.status, 'active'))).limit(1)
      return r.length > 0
    }
    case 'knowledge_asset': {
      const r = await db.select({ id: dnaKnowledgeAssets.id }).from(dnaKnowledgeAssets)
        .where(and(eq(dnaKnowledgeAssets.brandId, brandId), eq(dnaKnowledgeAssets.status, 'active'))).limit(1)
      return r.length > 0
    }
    // Singular DNA: assume present if the row exists. For V1 we don't gate on these
    // (they're seed-required for the brand to function). Default-true keeps the picker permissive.
    case 'tone_of_voice':
    case 'business_overview':
    case 'brand_meaning':
    case 'brand_intro':
    case 'value_proposition':
      return true
    default:
      return true
  }
}

/** Single content type by slug. Used by `/content/create/[slug]`. */
export async function getContentTypeBySlug(slug: string): Promise<ContentType | null> {
  const rows = await db.select().from(contentTypes).where(eq(contentTypes.slug, slug)).limit(1)
  return rows[0] ?? null
}

// ---------------------------------------------------------------------------
// AI models registry
// ---------------------------------------------------------------------------

export async function listActiveAiModels(): Promise<AiModel[]> {
  return db
    .select()
    .from(aiModels)
    .where(and(eq(aiModels.isActive, true), eq(aiModels.isArchived, false)))
    .orderBy(asc(aiModels.tier), asc(aiModels.name))
}

// ---------------------------------------------------------------------------
// Strategy field option-loaders (DNA picklists)
// ---------------------------------------------------------------------------

export type StrategyFieldOption = { value: string; label: string }

export async function listAudienceSegmentOptions(brandId: string): Promise<StrategyFieldOption[]> {
  const rows = await db
    .select({ id: dnaAudienceSegments.id, name: dnaAudienceSegments.segmentName })
    .from(dnaAudienceSegments)
    .where(and(eq(dnaAudienceSegments.brandId, brandId), eq(dnaAudienceSegments.status, 'active')))
    .orderBy(asc(dnaAudienceSegments.segmentName))
  return rows.map((r) => ({ value: r.id, label: r.name }))
}

export async function listOfferOptions(brandId: string): Promise<StrategyFieldOption[]> {
  const rows = await db
    .select({ id: dnaOffers.id, name: dnaOffers.name })
    .from(dnaOffers)
    .where(and(eq(dnaOffers.brandId, brandId), eq(dnaOffers.status, 'active')))
    .orderBy(asc(dnaOffers.name))
  return rows.map((r) => ({ value: r.id, label: r.name }))
}

export async function listKnowledgeAssetOptions(brandId: string): Promise<StrategyFieldOption[]> {
  const rows = await db
    .select({ id: dnaKnowledgeAssets.id, name: dnaKnowledgeAssets.name })
    .from(dnaKnowledgeAssets)
    .where(and(eq(dnaKnowledgeAssets.brandId, brandId), eq(dnaKnowledgeAssets.status, 'active')))
    .orderBy(asc(dnaKnowledgeAssets.name))
  return rows.map((r) => ({ value: r.id, label: r.name }))
}

export async function listPlatformOptions(brandId: string): Promise<StrategyFieldOption[]> {
  const rows = await db
    .select({ id: dnaPlatforms.id, name: dnaPlatforms.name })
    .from(dnaPlatforms)
    .where(and(eq(dnaPlatforms.brandId, brandId), eq(dnaPlatforms.isActive, true)))
    .orderBy(asc(dnaPlatforms.name))
  return rows.map((r) => ({ value: r.id, label: r.name }))
}

export async function listTovApplicationOptions(
  brandId: string,
  formatType: string,
): Promise<StrategyFieldOption[]> {
  const rows = await db
    .select({ id: dnaTovApplications.id, label: dnaTovApplications.label })
    .from(dnaTovApplications)
    .where(
      and(
        eq(dnaTovApplications.brandId, brandId),
        eq(dnaTovApplications.formatType, formatType),
        eq(dnaTovApplications.isCurrent, true),
      ),
    )
    .orderBy(asc(dnaTovApplications.label))
  return rows.map((r) => ({ value: r.id, label: r.label }))
}

/**
 * Customer journey stage is a fixed enum (per dna_audience_segments and
 * content_types.customer_journey_stage column comment).
 */
export const CUSTOMER_JOURNEY_STAGES: StrategyFieldOption[] = [
  { value: 'awareness', label: 'Awareness' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'consideration', label: 'Consideration' },
  { value: 'conversion', label: 'Conversion' },
  { value: 'retention', label: 'Retention' },
  { value: 'advocacy', label: 'Advocacy' },
]
