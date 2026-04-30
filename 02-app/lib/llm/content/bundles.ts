// DNA bundle resolvers — Layer 5 (Topic context) building blocks.
//
// Bundles are NAMED RESOLVERS, not placeholders. content_types.topic_context_config.dna_pulls[]
// lists the slugs to call in order; the assembler concatenates each resolver's
// non-null output into Layer 5.
//
// Vocabulary: 04-documentation/reference/prompt-vocabulary.md (V1 = 10 slugs).
//
// Selection rules (per vocab doc):
//  - Bundles that depend on a record (offer / segment / asset) read
//    inputs.strategy first. If the strategy slot is empty, the resolver either
//    short-circuits to null OR uses a documented default. The choice is
//    bundle-by-bundle and called out inline.
//  - Bundles that don't have data to pull return null and the assembler skips them.
//  - All resolvers are read-only and side-effect-free.

import { and, asc, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { dnaAudienceSegments } from '@/lib/db/schema/dna/audience-segments'
import { dnaBrandMeaning } from '@/lib/db/schema/dna/brand-meaning'
import { dnaEntityOutcomes } from '@/lib/db/schema/dna/entity-outcomes'
import { dnaTovSamples } from '@/lib/db/schema/dna/tone-of-voice'
import { srcOwnResearch } from '@/lib/db/schema/source'
import {
  type AssemblerCtx,
  getAudienceSegment,
  getKnowledgeAsset,
  getOffer,
  getToneOfVoice,
  getValueProposition,
} from './placeholders'
import type { BundleSlug } from './types'

export type BundleResolver = (ctx: AssemblerCtx) => Promise<string | null>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bullet(items: (string | null | undefined)[]): string {
  return items.filter((s): s is string => !!s && s.trim().length > 0).map((s) => `- ${s}`).join('\n')
}

function block(heading: string, body: string): string {
  return `### ${heading}\n${body}`
}

/**
 * Pick an audience segment for resolvers that allow either a strategy-selected
 * one or a sensible default. Default = first active segment by sortOrder.
 * Returns null only if the brand has no audience segments at all.
 */
async function pickAudienceSegment(ctx: AssemblerCtx) {
  const id = ctx.inputs.strategy.audience_segment
  if (id) return getAudienceSegment(ctx, id)
  const [row] = await db
    .select()
    .from(dnaAudienceSegments)
    .where(and(eq(dnaAudienceSegments.brandId, ctx.brandId), eq(dnaAudienceSegments.status, 'active')))
    .orderBy(asc(dnaAudienceSegments.sortOrder))
    .limit(1)
  return row ?? null
}

// ---------------------------------------------------------------------------
// audience_summary — one paragraph
// ---------------------------------------------------------------------------

async function audience_summary(ctx: AssemblerCtx): Promise<string | null> {
  const seg = await pickAudienceSegment(ctx)
  if (!seg) return null
  // segment_name + role/context fields. Fall through to summary if both
  // role_context and persona_name are empty.
  const parts: string[] = []
  parts.push(`**${seg.segmentName}**`)
  if (seg.personaName) parts.push(`(${seg.personaName})`)
  const head = parts.join(' ')
  const body = seg.roleContext ?? seg.summary ?? ''
  if (!body) return block('Audience', head)
  return block('Audience', `${head}\n\n${body}`)
}

// ---------------------------------------------------------------------------
// audience_voc — bulleted problems / desires / objections
// ---------------------------------------------------------------------------

async function audience_voc(ctx: AssemblerCtx): Promise<string | null> {
  const seg = await pickAudienceSegment(ctx)
  if (!seg) return null
  const problems = (seg.problems as unknown as string[]) ?? []
  const desires = (seg.desires as unknown as string[]) ?? []
  const objections = (seg.objections as unknown as string[]) ?? []
  if (problems.length === 0 && desires.length === 0 && objections.length === 0) return null
  const parts: string[] = [`### Voice of customer — ${seg.segmentName}`]
  if (problems.length > 0) parts.push(`**Problems**\n${bullet(problems)}`)
  if (desires.length > 0) parts.push(`**Desires**\n${bullet(desires)}`)
  if (objections.length > 0) parts.push(`**Objections**\n${bullet(objections)}`)
  return parts.join('\n\n')
}

// ---------------------------------------------------------------------------
// offer_full — full offer record block
// ---------------------------------------------------------------------------

async function offer_full(ctx: AssemblerCtx): Promise<string | null> {
  const id = ctx.inputs.strategy.offer
  if (!id) return null // offer-driven content types must select one; no default
  const offer = await getOffer(ctx, id)
  if (!offer) return null

  const outcomes = await db
    .select()
    .from(dnaEntityOutcomes)
    .where(and(eq(dnaEntityOutcomes.offerId, offer.id), eq(dnaEntityOutcomes.kind, 'outcome')))
    .orderBy(asc(dnaEntityOutcomes.sortOrder))
  const benefits = await db
    .select()
    .from(dnaEntityOutcomes)
    .where(and(eq(dnaEntityOutcomes.offerId, offer.id), eq(dnaEntityOutcomes.kind, 'benefit')))
    .orderBy(asc(dnaEntityOutcomes.sortOrder))

  const parts: string[] = [`### Offer — ${offer.name}`]
  if (offer.overview) parts.push(offer.overview)
  if (offer.usp) parts.push(`**USP**\n${offer.usp}${offer.uspExplanation ? `\n\n${offer.uspExplanation}` : ''}`)
  if (outcomes.length > 0) parts.push(`**Outcomes**\n${bullet(outcomes.map((o) => o.body))}`)
  if (benefits.length > 0) parts.push(`**Benefits**\n${bullet(benefits.map((b) => b.body))}`)
  if (offer.pricing && typeof offer.pricing === 'object') {
    const p = offer.pricing as { displayPrice?: string; mainPrice?: string | number; pricingNotes?: string }
    const price = p.displayPrice ?? (p.mainPrice != null ? String(p.mainPrice) : null)
    if (price) parts.push(`**Pricing**\n${price}${p.pricingNotes ? `\n${p.pricingNotes}` : ''}`)
  }
  if (offer.guarantee && typeof offer.guarantee === 'object') {
    const g = offer.guarantee as { headline?: string; description?: string }
    if (g.headline) parts.push(`**Guarantee**\n${g.headline}${g.description ? `\n${g.description}` : ''}`)
  }
  if (offer.cta) parts.push(`**Call to action**\n${offer.cta}`)
  return parts.join('\n\n')
}

// ---------------------------------------------------------------------------
// offer_summary — name + USP + top 3 outcomes
// ---------------------------------------------------------------------------

async function offer_summary(ctx: AssemblerCtx): Promise<string | null> {
  const id = ctx.inputs.strategy.offer
  if (!id) return null
  const offer = await getOffer(ctx, id)
  if (!offer) return null
  const outcomes = await db
    .select()
    .from(dnaEntityOutcomes)
    .where(and(eq(dnaEntityOutcomes.offerId, offer.id), eq(dnaEntityOutcomes.kind, 'outcome')))
    .orderBy(asc(dnaEntityOutcomes.sortOrder))
    .limit(3)
  const parts: string[] = [`### Offer — ${offer.name}`]
  if (offer.usp) parts.push(`**USP**: ${offer.usp}`)
  if (outcomes.length > 0) parts.push(`**Top outcomes**\n${bullet(outcomes.map((o) => o.body))}`)
  return parts.join('\n\n')
}

// ---------------------------------------------------------------------------
// tov_frame — ToV essence + samples filtered by format cascade
// ---------------------------------------------------------------------------

/** Documented cross-bucket fallbacks per channel-taxonomy.md ToV cascade. */
const FORMAT_FALLBACKS: Record<string, string[]> = {
  brainstorm: ['blog'],
  spoken_audio: ['spoken_video'],
  spoken_video: ['spoken_audio'],
  event: ['blog'],
  outreach: ['email'],
}

async function tov_frame(ctx: AssemblerCtx): Promise<string | null> {
  const tov = await getToneOfVoice(ctx)
  const parts: string[] = []
  if (tov?.summary) parts.push(`**Tone of voice essence**\n${tov.summary}`)
  if (tov?.linguisticNotes) parts.push(`**Linguistic notes**\n${tov.linguisticNotes}`)

  // Sample cascade: subtype → format_type → cross-bucket fallback.
  const samples = await pickTovSamples(ctx)
  if (samples.length > 0) {
    parts.push(
      `**Sample writing in this voice**\n\n${samples.map((s) => `> ${s.body.replace(/\n/g, '\n> ')}`).join('\n\n')}`,
    )
  }

  if (parts.length === 0) return null
  return parts.join('\n\n')
}

async function pickTovSamples(ctx: AssemblerCtx) {
  const { formatType, subtype } = ctx.contentType
  const SAMPLE_LIMIT = 2

  // 1. Exact subtype match
  if (subtype) {
    const rows = await db
      .select()
      .from(dnaTovSamples)
      .where(
        and(
          eq(dnaTovSamples.brandId, ctx.brandId),
          eq(dnaTovSamples.subtype, subtype),
          eq(dnaTovSamples.isCurrent, true),
        ),
      )
      .orderBy(desc(dnaTovSamples.updatedAt))
      .limit(SAMPLE_LIMIT)
    if (rows.length > 0) return rows
  }

  // 2. format_type bucket
  const ftRows = await db
    .select()
    .from(dnaTovSamples)
    .where(
      and(
        eq(dnaTovSamples.brandId, ctx.brandId),
        eq(dnaTovSamples.formatType, formatType),
        eq(dnaTovSamples.isCurrent, true),
      ),
    )
    .orderBy(desc(dnaTovSamples.updatedAt))
    .limit(SAMPLE_LIMIT)
  if (ftRows.length > 0) return ftRows

  // 3. Cross-bucket fallback
  for (const fallback of FORMAT_FALLBACKS[formatType] ?? []) {
    const rows = await db
      .select()
      .from(dnaTovSamples)
      .where(
        and(
          eq(dnaTovSamples.brandId, ctx.brandId),
          eq(dnaTovSamples.formatType, fallback),
          eq(dnaTovSamples.isCurrent, true),
        ),
      )
      .orderBy(desc(dnaTovSamples.updatedAt))
      .limit(SAMPLE_LIMIT)
    if (rows.length > 0) return rows
  }

  return []
}

// ---------------------------------------------------------------------------
// topic_intro — topic-chain leaf as a header line
// ---------------------------------------------------------------------------

async function topic_intro(ctx: AssemblerCtx): Promise<string | null> {
  const tc = ctx.inputs.topic_chain
  if (!tc) return null
  return `### Topic\n${tc.prompt_template_resolved}`
}

// ---------------------------------------------------------------------------
// value_proposition — core statement + differentiators
// ---------------------------------------------------------------------------

async function value_proposition(ctx: AssemblerCtx): Promise<string | null> {
  const vp = await getValueProposition(ctx)
  if (!vp) return null
  const parts: string[] = ['### Value proposition']
  if (vp.coreStatement) parts.push(vp.coreStatement)
  const diffs = (vp.differentiators ?? []).slice(0, 3)
  if (diffs.length > 0) parts.push(`**Differentiators**\n${bullet(diffs)}`)
  if (parts.length === 1) return null // header alone is not useful
  return parts.join('\n\n')
}

// ---------------------------------------------------------------------------
// brand_meaning — vision / mission / purpose / values
// ---------------------------------------------------------------------------

async function brand_meaning(ctx: AssemblerCtx): Promise<string | null> {
  const [bm] = await db
    .select()
    .from(dnaBrandMeaning)
    .where(eq(dnaBrandMeaning.brandId, ctx.brandId))
    .limit(1)
  if (!bm) return null
  const parts: string[] = ['### Brand meaning']
  if (bm.vision) parts.push(`**Vision**\n${bm.vision}`)
  if (bm.mission) parts.push(`**Mission**\n${bm.mission}`)
  if (bm.purpose) parts.push(`**Purpose**\n${bm.purpose}`)
  if (bm.values && Array.isArray(bm.values) && bm.values.length > 0) {
    // Tolerate two possible shapes: array of strings, or array of { name, description }.
    const lines = (bm.values as unknown[]).map((v) => {
      if (typeof v === 'string') return v
      if (v && typeof v === 'object' && 'name' in v) {
        const obj = v as { name: string; description?: string }
        return obj.description ? `${obj.name}: ${obj.description}` : obj.name
      }
      return null
    })
    parts.push(`**Values**\n${bullet(lines)}`)
  }
  if (parts.length === 1) return null
  return parts.join('\n\n')
}

// ---------------------------------------------------------------------------
// knowledge_asset — overview + key components / process
// ---------------------------------------------------------------------------

async function knowledge_asset(ctx: AssemblerCtx): Promise<string | null> {
  const id = ctx.inputs.strategy.knowledge_asset
  if (!id) return null
  const asset = await getKnowledgeAsset(ctx, id)
  if (!asset) return null
  const parts: string[] = [`### Knowledge asset — ${asset.name}`]
  if (asset.summary) parts.push(asset.summary)
  if (asset.principles) parts.push(`**Principles**\n${asset.principles}`)
  const components = (asset.keyComponents as unknown as { title: string; description?: string }[]) ?? []
  if (components.length > 0) {
    parts.push(
      `**Key components**\n${bullet(components.map((c) => (c.description ? `${c.title} — ${c.description}` : c.title)))}`,
    )
  }
  const flow = (asset.flow as unknown as { step?: number | string; title: string; description?: string }[]) ?? []
  if (flow.length > 0) {
    parts.push(
      `**Process**\n${bullet(flow.map((s) => `${s.step != null ? `${s.step}. ` : ''}${s.title}${s.description ? ` — ${s.description}` : ''}`))}`,
    )
  }
  return parts.join('\n\n')
}

// ---------------------------------------------------------------------------
// recent_research — last 3 src_own_research rows, summary fields only
// ---------------------------------------------------------------------------

async function recent_research(ctx: AssemblerCtx): Promise<string | null> {
  const rows = await db
    .select()
    .from(srcOwnResearch)
    .where(and(eq(srcOwnResearch.brandId, ctx.brandId), eq(srcOwnResearch.isArchived, false)))
    .orderBy(desc(srcOwnResearch.conductedAt))
    .limit(3)
  if (rows.length === 0) return null
  const items = rows.map((r) => `**${r.title}**\n${r.summary}`)
  return `### Recent original research\n\n${items.join('\n\n')}`
}

// ---------------------------------------------------------------------------
// Resolver map (V1)
// ---------------------------------------------------------------------------

export const BUNDLE_RESOLVERS: Record<BundleSlug, BundleResolver> = {
  offer_full,
  offer_summary,
  audience_voc,
  audience_summary,
  tov_frame,
  topic_intro,
  value_proposition,
  brand_meaning,
  knowledge_asset,
  recent_research,
}

export function isKnownBundleSlug(slug: string): slug is BundleSlug {
  return slug in BUNDLE_RESOLVERS
}
