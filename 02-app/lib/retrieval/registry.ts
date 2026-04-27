import { sql, type SQL } from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'
import { graphNodes } from '@/lib/db/schema/graph'
import {
  srcSourceDocuments,
  srcStatistics,
  srcTestimonials,
  srcStories,
  srcOwnResearch,
} from '@/lib/db/schema/source'
import {
  dnaBusinessOverview,
  dnaBrandMeaning,
  dnaValueProposition,
  dnaKnowledgeAssets,
  dnaTovSamples,
} from '@/lib/db/schema/dna'
import { processingRuns } from '@/lib/db/schema/inputs/processing-runs'
import type { RetrievalResult } from './types'

// ---------------------------------------------------------------------------
// Embeddable table registry
// ---------------------------------------------------------------------------

export interface EmbeddableTableConfig {
  /** Unique key for this table (matches EmbeddableTable type in similarity.ts) */
  key: string
  /** The Drizzle table object */
  drizzleTable: PgTable
  /** What type to assign in RetrievalResult */
  resultType: RetrievalResult['type']
  /** Optional subtype for more context */
  subtype?: string
  /** SQL expression for the human-readable label */
  labelExpr: SQL
  /** SQL expression for the text snippet */
  snippetExpr: SQL
  /** SQL expression for the date field (or null if no date) */
  dateExpr: SQL | null
}

/**
 * Registry of all tables that can be searched via semantic vector search.
 * Adding a new searchable table = adding one entry here.
 */
export const EMBEDDABLE_TABLES: EmbeddableTableConfig[] = [
  // --- Graph nodes ---
  {
    key: 'graph_nodes',
    drizzleTable: graphNodes,
    resultType: 'graph_node',
    labelExpr: sql`name`,
    snippetExpr: sql`description`,
    dateExpr: sql`created_at`,
  },

  // --- Source knowledge ---
  {
    key: 'src_source_documents',
    drizzleTable: srcSourceDocuments,
    resultType: 'source_document',
    labelExpr: sql`title`,
    snippetExpr: sql`LEFT(extracted_text, 300)`,
    dateExpr: sql`COALESCE(document_date::timestamptz, created_at)`,
  },
  {
    key: 'src_statistics',
    drizzleTable: srcStatistics,
    resultType: 'statistic',
    labelExpr: sql`COALESCE(short_label, LEFT(stat, 100))`,
    snippetExpr: sql`stat`,
    dateExpr: sql`created_at`,
  },
  {
    key: 'src_testimonials',
    drizzleTable: srcTestimonials,
    resultType: 'testimonial',
    labelExpr: sql`client_name || ' — ' || LEFT(quote, 80)`,
    snippetExpr: sql`COALESCE(edited_quote, quote)`,
    dateExpr: sql`COALESCE(collected_at::timestamptz, created_at)`,
  },
  {
    key: 'src_stories',
    drizzleTable: srcStories,
    resultType: 'story',
    labelExpr: sql`title`,
    snippetExpr: sql`LEFT(narrative, 300)`,
    dateExpr: sql`COALESCE(occurred_at::timestamptz, created_at)`,
  },
  {
    key: 'src_own_research',
    drizzleTable: srcOwnResearch,
    resultType: 'research',
    labelExpr: sql`title`,
    snippetExpr: sql`LEFT(summary, 300)`,
    dateExpr: sql`COALESCE(conducted_at::timestamptz, created_at)`,
  },

  // --- DNA (only tables with embedding columns) ---
  {
    key: 'dna_business_overview',
    drizzleTable: dnaBusinessOverview,
    resultType: 'dna',
    subtype: 'business_overview',
    labelExpr: sql`business_name`,
    snippetExpr: sql`COALESCE(full_description, short_description)`,
    dateExpr: sql`updated_at`,
  },
  {
    key: 'dna_brand_meaning',
    drizzleTable: dnaBrandMeaning,
    resultType: 'dna',
    subtype: 'brand_meaning',
    labelExpr: sql`'Brand meaning'`,
    snippetExpr: sql`COALESCE(vision, '') || ' ' || COALESCE(mission, '') || ' ' || COALESCE(purpose, '')`,
    dateExpr: sql`updated_at`,
  },
  {
    key: 'dna_value_proposition',
    drizzleTable: dnaValueProposition,
    resultType: 'dna',
    subtype: 'value_proposition',
    labelExpr: sql`'Value proposition'`,
    snippetExpr: sql`COALESCE(core_statement, elevator_pitch, 'No statement yet')`,
    dateExpr: sql`updated_at`,
  },
  {
    key: 'dna_knowledge_assets',
    drizzleTable: dnaKnowledgeAssets,
    resultType: 'dna',
    subtype: 'knowledge_asset',
    labelExpr: sql`name`,
    snippetExpr: sql`COALESCE(summary, problems_solved, 'No summary yet')`,
    dateExpr: sql`updated_at`,
  },
  {
    key: 'dna_tov_samples',
    drizzleTable: dnaTovSamples,
    resultType: 'dna',
    subtype: 'tov_sample',
    labelExpr: sql`format_type || ' sample'`,
    snippetExpr: sql`LEFT(body, 300)`,
    dateExpr: sql`created_at`,
  },

  // --- Processing runs (analysis results) ---
  {
    key: 'processing_runs',
    drizzleTable: processingRuns,
    resultType: 'processing_run',
    labelExpr: sql`COALESCE(title, mode || ' analysis')`,
    snippetExpr: sql`LEFT(COALESCE(title, '') || ' — ' || mode || ' analysis', 200)`,
    dateExpr: sql`created_at`,
  },
]

/**
 * Filter the registry to tables matching the given result types.
 * If no types provided, returns all tables.
 */
export function getSearchableTables(
  typeFilter?: RetrievalResult['type'][]
): EmbeddableTableConfig[] {
  if (!typeFilter || typeFilter.length === 0) return EMBEDDABLE_TABLES
  return EMBEDDABLE_TABLES.filter((t) => typeFilter.includes(t.resultType))
}
