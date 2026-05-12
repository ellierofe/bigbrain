import { eq, and, ne, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  dnaBusinessOverview,
  dnaBrandMeaning,
  dnaValueProposition,
  dnaBrandIdentity,
  dnaAudienceSegments,
  dnaOffers,
  dnaKnowledgeAssets,
  dnaPlatforms,
  dnaCompetitors,
  dnaToneOfVoice,
  dnaTovSamples,
  dnaTovApplications,
} from '@/lib/db/schema/dna'
import {
  srcSourceDocuments,
  srcStatistics,
  srcTestimonials,
  srcStories,
  srcOwnResearch,
} from '@/lib/db/schema/source'
import { processingRuns } from '@/lib/db/schema/inputs/processing-runs'
import type { DnaType, SourceType, RetrievalResult } from './types'

// ---------------------------------------------------------------------------
// DNA lookup
// ---------------------------------------------------------------------------

// Singular types: one record per brand
const SINGULAR_DNA = {
  business_overview: dnaBusinessOverview,
  brand_meaning: dnaBrandMeaning,
  value_proposition: dnaValueProposition,
  brand_identity: dnaBrandIdentity,
  tone_of_voice: dnaToneOfVoice,
} as const

// Plural types: multiple records per brand
const PLURAL_DNA = {
  audience_segments: dnaAudienceSegments,
  offers: dnaOffers,
  knowledge_assets: dnaKnowledgeAssets,
  platforms: dnaPlatforms,
  competitors: dnaCompetitors,
} as const

type SingularDnaType = keyof typeof SINGULAR_DNA
type PluralDnaType = keyof typeof PLURAL_DNA

function isSingular(t: DnaType): t is SingularDnaType {
  return t in SINGULAR_DNA
}

/**
 * Load Brand DNA data by type.
 * - Singular types return the single record for the brand.
 * - Plural types return all active items, or a single item by ID.
 * - Facet extracts a specific field from the record as the snippet.
 *
 * For tone_of_voice: also loads samples and application deltas.
 */
export async function getDna(
  dnaType: DnaType,
  brandId: string,
  itemId?: string,
  facet?: string
): Promise<RetrievalResult[]> {
  if (dnaType === 'tone_of_voice') {
    return getToneOfVoice(brandId)
  }

  if (isSingular(dnaType)) {
    const table = SINGULAR_DNA[dnaType]
    const rows = await db
      .select()
      .from(table)
      .where(eq((table as any).brandId, brandId))
      .limit(1)

    return rows.map((row: any) => ({
      id: row.id,
      type: 'dna' as const,
      subtype: dnaType,
      name: getNameForDna(dnaType, row),
      date: row.updatedAt?.toISOString(),
      reason: 'explicitly requested',
      snippet: facet ? extractFacet(row, facet) : getSummaryForDna(dnaType, row),
    }))
  }

  // Plural types
  const table = PLURAL_DNA[dnaType as PluralDnaType]
  const conditions = [(table as any).brandId ? eq((table as any).brandId, brandId) : undefined]

  if (itemId) {
    conditions.push(eq((table as any).id, itemId))
  } else {
    // Filter to active items where status column exists
    if ('status' in (table as any)) {
      conditions.push(ne((table as any).status, 'archived'))
    }
  }

  const validConditions = conditions.filter(Boolean)
  const rows = await db
    .select()
    .from(table)
    .where(validConditions.length > 1 ? and(...validConditions) : validConditions[0]!)

  return rows.map((row: any) => ({
    id: row.id,
    type: 'dna' as const,
    subtype: dnaType,
    name: row.name ?? row.segmentName ?? row.platformName ?? dnaType,
    date: row.updatedAt?.toISOString(),
    reason: 'explicitly requested',
    snippet: facet ? extractFacet(row, facet) : getSummaryForPlural(dnaType, row),
  }))
}

async function getToneOfVoice(brandId: string): Promise<RetrievalResult[]> {
  // Skip drafts — only the active/archived current record is retrievable.
  const [tov] = await db
    .select()
    .from(dnaToneOfVoice)
    .where(
      and(eq(dnaToneOfVoice.brandId, brandId), ne(dnaToneOfVoice.status, 'draft'))
    )
    .orderBy(desc(dnaToneOfVoice.updatedAt))
    .limit(1)

  if (!tov) return []

  const samples = await db
    .select()
    .from(dnaTovSamples)
    .where(and(eq(dnaTovSamples.brandId, brandId), eq(dnaTovSamples.isCurrent, true)))

  const applications = await db
    .select()
    .from(dnaTovApplications)
    .where(and(eq(dnaTovApplications.brandId, brandId), eq(dnaTovApplications.isCurrent, true)))

  const snippet = [
    tov.summary ?? '',
    samples.length > 0 ? `\n\nSamples (${samples.length}):` : '',
    ...samples.map((s) => `\n[${s.formatType}] ${s.body?.slice(0, 200)}`),
    applications.length > 0 ? `\n\nApplication deltas (${applications.length}):` : '',
    ...applications.map((a) => `\n[${a.formatType}] ${a.label}: ${a.notes ?? ''}`),
  ].join('')

  return [{
    id: tov.id,
    type: 'dna',
    subtype: 'tone_of_voice',
    name: 'Tone of voice',
    date: tov.updatedAt?.toISOString(),
    reason: 'explicitly requested',
    snippet: snippet.trim(),
  }]
}

function getNameForDna(type: SingularDnaType, row: any): string {
  switch (type) {
    case 'business_overview': return row.businessName ?? 'Business overview'
    case 'brand_meaning': return 'Brand meaning'
    case 'value_proposition': return 'Value proposition'
    case 'brand_identity': return 'Brand identity'
    case 'tone_of_voice': return 'Tone of voice'
  }
}

function getSummaryForDna(type: SingularDnaType, row: any): string {
  switch (type) {
    case 'business_overview':
      return row.fullDescription ?? row.shortDescription ?? ''
    case 'brand_meaning':
      return [row.vision, row.mission, row.purpose].filter(Boolean).join('\n\n')
    case 'value_proposition':
      return row.coreStatement ?? row.elevatorPitch ?? ''
    case 'brand_identity':
      return JSON.stringify({ colours: row.colours, typography: row.typography }, null, 2)
    case 'tone_of_voice':
      return row.summary ?? ''
  }
}

function getSummaryForPlural(type: string, row: any): string {
  switch (type) {
    case 'audience_segments': return row.summary ?? ''
    case 'offers': return row.overview ?? ''
    case 'knowledge_assets': return row.summary ?? row.problemsSolved ?? ''
    case 'platforms': return row.strategy ?? row.overview ?? ''
    case 'competitors': return row.overview ?? ''
    default: return ''
  }
}

function extractFacet(row: any, facet: string): string {
  const value = row[facet] ?? row[camelCase(facet)]
  if (value === undefined || value === null) return ''
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
}

function camelCase(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

// ---------------------------------------------------------------------------
// Source knowledge lookup
// ---------------------------------------------------------------------------

const SOURCE_TABLES = {
  documents: srcSourceDocuments,
  statistics: srcStatistics,
  testimonials: srcTestimonials,
  stories: srcStories,
  research: srcOwnResearch,
  analysis: processingRuns,
} as const

/**
 * Load source knowledge by type.
 * - If itemId provided: return that specific item.
 * - If query provided: delegate to searchKnowledge scoped to this source type.
 * - Otherwise: return recent items of this type (limit 20).
 */
export async function getSource(
  sourceType: SourceType,
  brandId: string,
  itemId?: string,
  query?: string
): Promise<RetrievalResult[]> {
  // Query mode — delegate to semantic search (imported lazily to avoid circular)
  if (query && !itemId) {
    const { searchKnowledge } = await import('./similarity')
    const typeMap: Record<SourceType, RetrievalResult['type']> = {
      documents: 'source_document',
      statistics: 'statistic',
      testimonials: 'testimonial',
      stories: 'story',
      research: 'research',
      analysis: 'processing_run',
    }
    return searchKnowledge(query, { types: [typeMap[sourceType]], limit: 10 })
  }

  const table = SOURCE_TABLES[sourceType]

  if (itemId) {
    const rows = await db
      .select()
      .from(table)
      .where(eq((table as any).id, itemId))
      .limit(1)

    return rows.map((row: any) => toSourceResult(sourceType, row))
  }

  // List recent
  const rows = await db
    .select()
    .from(table)
    .where(eq((table as any).brandId, brandId))
    .orderBy(desc((table as any).createdAt))
    .limit(20)

  return rows.map((row: any) => toSourceResult(sourceType, row))
}

function toSourceResult(sourceType: SourceType, row: any): RetrievalResult {
  const typeMap: Record<SourceType, RetrievalResult['type']> = {
    documents: 'source_document',
    statistics: 'statistic',
    testimonials: 'testimonial',
    stories: 'story',
    research: 'research',
    analysis: 'processing_run',
  }

  return {
    id: row.id,
    type: typeMap[sourceType],
    subtype: row.type ?? row.mode ?? sourceType,
    name: row.title ?? row.clientName ?? row.shortLabel ?? row.name ?? sourceType,
    date: (row.documentDate ?? row.collectedAt ?? row.conductedAt ?? row.createdAt)?.toString(),
    reason: 'explicitly requested',
    snippet: getSourceSnippet(sourceType, row),
  }
}

function getSourceSnippet(type: SourceType, row: any): string {
  switch (type) {
    case 'documents': return (row.extractedText ?? '').slice(0, 300)
    case 'statistics': return row.stat ?? ''
    case 'testimonials': return row.editedQuote ?? row.quote ?? ''
    case 'stories': return (row.narrative ?? '').slice(0, 300)
    case 'research': return (row.summary ?? '').slice(0, 300)
    case 'analysis': return row.title ?? `${row.mode} analysis`
    default: return ''
  }
}

// ---------------------------------------------------------------------------
// Processing run lookup
// ---------------------------------------------------------------------------

/**
 * Load a single processing run by ID with its full analysis result.
 */
export async function getProcessingRun(runId: string): Promise<RetrievalResult | null> {
  const [row] = await db
    .select()
    .from(processingRuns)
    .where(eq(processingRuns.id, runId))
    .limit(1)

  if (!row) return null

  // INP-12: `processing_runs.mode/title/analysisResult` were renamed/removed in v3.
  // For retrieval surface compatibility this maps the new schema back to the legacy
  // citation shape until Phase 3 replaces this helper with a lens-aware version.
  const legacyRow = row as unknown as { lens: string; title?: string | null; analysisResult?: unknown }
  return {
    id: row.id,
    type: 'processing_run',
    subtype: legacyRow.lens,
    name: legacyRow.title ?? `${legacyRow.lens} analysis`,
    date: row.createdAt?.toISOString(),
    reason: 'explicitly requested',
    snippet: legacyRow.analysisResult
      ? JSON.stringify(legacyRow.analysisResult).slice(0, 500)
      : legacyRow.title ?? '',
  }
}
