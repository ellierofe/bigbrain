// Placeholder resolvers — Layer-agnostic substitution for ${name} tokens.
//
// Vocabulary is the closed set declared in 04-documentation/reference/prompt-vocabulary.md
// and mirrored in ALL_PLACEHOLDERS in ./types.ts. Three groups:
//   A. Strategy / topic-chain selections — read from GenerationInputs.
//   B. Brand DNA — read from singular DNA tables (cached per request).
//   C. Stage / settings state — read from settings + stage row.
//
// Anything not in this map is treated as a fragment slug ref by the assembler
// caller and routed through the fragment registry instead. Unknown names that
// are not fragment slugs surface as assembly errors (fail-closed per vocab doc).

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { dnaAudienceSegments } from '@/lib/db/schema/dna/audience-segments'
import { dnaBusinessOverview } from '@/lib/db/schema/dna/business-overview'
import { dnaKnowledgeAssets } from '@/lib/db/schema/dna/knowledge-assets'
import { dnaOffers } from '@/lib/db/schema/dna/offers'
import { dnaPlatforms } from '@/lib/db/schema/dna/platforms'
import { dnaToneOfVoice } from '@/lib/db/schema/dna/tone-of-voice'
import { dnaValueProposition } from '@/lib/db/schema/dna/value-proposition'
import type { GenerationInputs, PlaceholderName } from './types'

// ---------------------------------------------------------------------------
// AssemblerCtx — per-call state bag
// ---------------------------------------------------------------------------

/**
 * Shared context for one assemble() call. Holds:
 *  - the brand scope for DNA reads
 *  - per-request DNA caches (each table read at most once per call)
 *  - stage/settings constants pre-extracted for Group C resolvers
 *
 * Constructed by the assembler at the top of the call; passed to every
 * resolver. No persistence, no cross-call sharing.
 */
export type AssemblerCtx = {
  brandId: string
  inputs: GenerationInputs
  /** Content-type metadata needed by channel-/format-aware bundle resolvers. */
  contentType: {
    slug: string
    platformType: string // channel key (e.g. 'instagram', 'newsletter')
    formatType: string // ToV cascade bucket (e.g. 'social_short', 'newsletter')
    subtype: string | null // canonical leaf (preferred ToV match when present)
  }
  /** Pre-computed Group C constants. */
  constants: {
    variantCount: number
    minChars: number | null
    maxChars: number | null
  }
  /** DNA caches — populated lazily on first read. */
  cache: AssemblerCache
}

type AssemblerCache = {
  businessOverview?: typeof dnaBusinessOverview.$inferSelect | null
  toneOfVoice?: typeof dnaToneOfVoice.$inferSelect | null
  valueProposition?: typeof dnaValueProposition.$inferSelect | null
  /** segment_id → row */
  audienceSegmentById: Map<string, typeof dnaAudienceSegments.$inferSelect | null>
  offerById: Map<string, typeof dnaOffers.$inferSelect | null>
  platformById: Map<string, typeof dnaPlatforms.$inferSelect | null>
  knowledgeAssetById: Map<string, typeof dnaKnowledgeAssets.$inferSelect | null>
}

export function createAssemblerCtx(
  brandId: string,
  inputs: GenerationInputs,
  contentType: AssemblerCtx['contentType'],
  stageHints: { defaultMinChars: number | null; defaultMaxChars: number | null },
): AssemblerCtx {
  return {
    brandId,
    inputs,
    contentType,
    constants: {
      variantCount: inputs.settings.variant_count,
      minChars: stageHints.defaultMinChars,
      maxChars: stageHints.defaultMaxChars,
    },
    cache: {
      audienceSegmentById: new Map(),
      offerById: new Map(),
      platformById: new Map(),
      knowledgeAssetById: new Map(),
    },
  }
}

// ---------------------------------------------------------------------------
// Cached DNA accessors
// ---------------------------------------------------------------------------

export async function getBusinessOverview(ctx: AssemblerCtx) {
  if (ctx.cache.businessOverview !== undefined) return ctx.cache.businessOverview
  const [row] = await db
    .select()
    .from(dnaBusinessOverview)
    .where(eq(dnaBusinessOverview.brandId, ctx.brandId))
    .limit(1)
  ctx.cache.businessOverview = row ?? null
  return ctx.cache.businessOverview
}

export async function getToneOfVoice(ctx: AssemblerCtx) {
  if (ctx.cache.toneOfVoice !== undefined) return ctx.cache.toneOfVoice
  const [row] = await db
    .select()
    .from(dnaToneOfVoice)
    .where(eq(dnaToneOfVoice.brandId, ctx.brandId))
    .limit(1)
  ctx.cache.toneOfVoice = row ?? null
  return ctx.cache.toneOfVoice
}

export async function getValueProposition(ctx: AssemblerCtx) {
  if (ctx.cache.valueProposition !== undefined) return ctx.cache.valueProposition
  const [row] = await db
    .select()
    .from(dnaValueProposition)
    .where(eq(dnaValueProposition.brandId, ctx.brandId))
    .limit(1)
  ctx.cache.valueProposition = row ?? null
  return ctx.cache.valueProposition
}

export async function getAudienceSegment(ctx: AssemblerCtx, id: string) {
  if (ctx.cache.audienceSegmentById.has(id)) return ctx.cache.audienceSegmentById.get(id)!
  const [row] = await db
    .select()
    .from(dnaAudienceSegments)
    .where(eq(dnaAudienceSegments.id, id))
    .limit(1)
  ctx.cache.audienceSegmentById.set(id, row ?? null)
  return row ?? null
}

export async function getOffer(ctx: AssemblerCtx, id: string) {
  if (ctx.cache.offerById.has(id)) return ctx.cache.offerById.get(id)!
  const [row] = await db.select().from(dnaOffers).where(eq(dnaOffers.id, id)).limit(1)
  ctx.cache.offerById.set(id, row ?? null)
  return row ?? null
}

export async function getPlatform(ctx: AssemblerCtx, id: string) {
  if (ctx.cache.platformById.has(id)) return ctx.cache.platformById.get(id)!
  const [row] = await db.select().from(dnaPlatforms).where(eq(dnaPlatforms.id, id)).limit(1)
  ctx.cache.platformById.set(id, row ?? null)
  return row ?? null
}

export async function getKnowledgeAsset(ctx: AssemblerCtx, id: string) {
  if (ctx.cache.knowledgeAssetById.has(id)) return ctx.cache.knowledgeAssetById.get(id)!
  const [row] = await db
    .select()
    .from(dnaKnowledgeAssets)
    .where(eq(dnaKnowledgeAssets.id, id))
    .limit(1)
  ctx.cache.knowledgeAssetById.set(id, row ?? null)
  return row ?? null
}

// ---------------------------------------------------------------------------
// Resolvers
// ---------------------------------------------------------------------------

/**
 * Resolve a placeholder by name. Throws on unresolved required values
 * (fail-closed). Returns null only when caller signalled an optional miss
 * (currently nothing — but kept on the type for V2 escapes).
 */
export type PlaceholderResolver = (ctx: AssemblerCtx) => Promise<string>

const RESOLVERS: Record<PlaceholderName, PlaceholderResolver> = {
  // -------------------------------------------------------------------------
  // Group A — strategy / topic-chain
  // -------------------------------------------------------------------------
  selected: async (ctx) => {
    const tc = ctx.inputs.topic_chain
    if (!tc) {
      throw new Error('Placeholder ${selected} requires a topic_chain on inputs')
    }
    return tc.prompt_template_resolved
  },
  selected_items_joined: async (ctx) => {
    const tc = ctx.inputs.topic_chain
    if (!tc) throw new Error('Placeholder ${selected_items_joined} requires a topic_chain')
    const items = (tc.step4 ?? tc.step3 ?? []).filter((s) => s.length > 0)
    if (items.length === 0) {
      throw new Error('Placeholder ${selected_items_joined} requires step3 or step4 items')
    }
    if (items.length === 1) return `"${items[0]}"`
    if (items.length === 2) return `"${items[0]}" and "${items[1]}"`
    return `${items.slice(0, -1).map((i) => `"${i}"`).join(', ')} and "${items[items.length - 1]}"`
  },
  segment_name: async (ctx) => {
    const id = ctx.inputs.strategy.audience_segment
    if (!id) throw new Error('Placeholder ${segment_name} requires strategy.audience_segment')
    const seg = await getAudienceSegment(ctx, id)
    if (!seg) throw new Error(`Audience segment not found: ${id}`)
    return seg.segmentName
  },
  offer_name: async (ctx) => {
    const id = ctx.inputs.strategy.offer
    if (!id) throw new Error('Placeholder ${offer_name} requires strategy.offer')
    const offer = await getOffer(ctx, id)
    if (!offer) throw new Error(`Offer not found: ${id}`)
    return offer.name
  },
  platform_name: async (ctx) => {
    const id = ctx.inputs.strategy.platform
    if (!id) throw new Error('Placeholder ${platform_name} requires strategy.platform')
    const platform = await getPlatform(ctx, id)
    if (!platform) throw new Error(`Platform not found: ${id}`)
    return platform.name
  },
  asset_name: async (ctx) => {
    const id = ctx.inputs.strategy.knowledge_asset
    if (!id) throw new Error('Placeholder ${asset_name} requires strategy.knowledge_asset')
    const asset = await getKnowledgeAsset(ctx, id)
    if (!asset) throw new Error(`Knowledge asset not found: ${id}`)
    return asset.name
  },
  aspect_label: async (ctx) => {
    // Step-3 aspect labels live on the topic_chain; the picker should have
    // captured the human-readable label before submitting. V1: read step3[0]
    // verbatim since picker passes labels not ids for aspect cascades.
    const tc = ctx.inputs.topic_chain
    const label = tc?.step3?.[0]
    if (!label) throw new Error('Placeholder ${aspect_label} requires topic_chain.step3[0]')
    return label
  },
  value: async (ctx) => {
    // Single-value aspects (USP, Guarantee, Pricing, CTA) — picker writes the
    // resolved value into step4[0] for these cascades.
    const tc = ctx.inputs.topic_chain
    const v = tc?.step4?.[0]
    if (!v) throw new Error('Placeholder ${value} requires topic_chain.step4[0]')
    return v
  },
  cta_url: async (ctx) => {
    const v = ctx.inputs.strategy.cta_url
    if (!v) throw new Error('Placeholder ${cta_url} requires strategy.cta_url')
    return v
  },
  sales_page_angle: async (ctx) => {
    const v = ctx.inputs.strategy.sales_page_angle
    if (!v) throw new Error('Placeholder ${sales_page_angle} requires strategy.sales_page_angle')
    return v
  },
  customer_journey_stage: async (ctx) => {
    const v = ctx.inputs.strategy.customer_journey_stage
    if (!v) {
      throw new Error('Placeholder ${customer_journey_stage} requires strategy.customer_journey_stage')
    }
    return v
  },

  // -------------------------------------------------------------------------
  // Group B — brand DNA
  // -------------------------------------------------------------------------
  brand_name: async (ctx) => {
    const bo = await getBusinessOverview(ctx)
    if (!bo) throw new Error('No dna_business_overview row for current brand')
    return bo.businessName
  },
  business_context_short: async (ctx) => {
    const bo = await getBusinessOverview(ctx)
    if (!bo) throw new Error('No dna_business_overview row for current brand')
    // Brand-context bundle (Layer 4) short version. V1: shortDescription
    // with vertical/specialism appended when shortDescription is empty.
    if (bo.shortDescription) return bo.shortDescription
    return `${bo.businessName} works in ${bo.vertical}, specialising in ${bo.specialism}.`
  },
  tov_core: async (ctx) => {
    const tov = await getToneOfVoice(ctx)
    if (!tov || !tov.summary) {
      throw new Error('No dna_tone_of_voice.summary for current brand — ToV must be generated first')
    }
    return tov.summary
  },
  voc_problems: async (ctx) => formatVoc(ctx, 'problems'),
  voc_desires: async (ctx) => formatVoc(ctx, 'desires'),
  voc_objections: async (ctx) => formatVoc(ctx, 'objections'),
  value_proposition_core: async (ctx) => {
    const vp = await getValueProposition(ctx)
    if (!vp || !vp.coreStatement) {
      throw new Error('No dna_value_proposition.coreStatement for current brand')
    }
    return vp.coreStatement
  },
  offer_benefits: async (_ctx) => {
    // Real impl: query dna_entity_outcomes WHERE offerId=X AND kind='benefit'
    // Deferred — V1 V1 content types don't reference this placeholder. Leaving
    // the wiring obvious so the punchlist for future content types is small.
    throw new Error(
      'Placeholder ${offer_benefits} resolver not implemented — wire dna_entity_outcomes query when needed',
    )
  },

  // -------------------------------------------------------------------------
  // Group C — stage / settings constants
  // -------------------------------------------------------------------------
  variant_count: async (ctx) => String(ctx.constants.variantCount),
  min_chars: async (ctx) => {
    if (ctx.constants.minChars == null) {
      throw new Error('Placeholder ${min_chars} requires stage or content_type defaultMinChars')
    }
    return String(ctx.constants.minChars)
  },
  max_chars: async (ctx) => {
    if (ctx.constants.maxChars == null) {
      throw new Error('Placeholder ${max_chars} requires stage or content_type defaultMaxChars')
    }
    return String(ctx.constants.maxChars)
  },
}

async function formatVoc(
  ctx: AssemblerCtx,
  field: 'problems' | 'desires' | 'objections',
): Promise<string> {
  // Filter by selected segment when one is chosen; otherwise aggregate across
  // active segments (per vocab doc Group B note).
  const selectedId = ctx.inputs.strategy.audience_segment ?? null
  let rows: (typeof dnaAudienceSegments.$inferSelect)[]
  if (selectedId) {
    const row = await getAudienceSegment(ctx, selectedId)
    rows = row ? [row] : []
  } else {
    rows = await db
      .select()
      .from(dnaAudienceSegments)
      .where(eq(dnaAudienceSegments.brandId, ctx.brandId))
  }
  const items: string[] = []
  for (const r of rows) {
    const arr = (r[field] as unknown as string[]) ?? []
    for (const v of arr) if (v) items.push(v)
  }
  if (items.length === 0) {
    throw new Error(`Placeholder \${voc_${field}} resolved to empty — no audience VOC data`)
  }
  return items.map((s) => `- ${s}`).join('\n')
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function isKnownPlaceholder(name: string): name is PlaceholderName {
  return name in RESOLVERS
}

/** Resolve a single placeholder. Caller must have ensured isKnownPlaceholder first. */
export function resolvePlaceholder(name: PlaceholderName, ctx: AssemblerCtx): Promise<string> {
  return RESOLVERS[name](ctx)
}
