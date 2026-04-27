import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  dnaBusinessOverview,
  dnaBrandMeaning,
  dnaValueProposition,
  dnaKnowledgeAssets,
  dnaTovSamples,
} from '@/lib/db/schema/dna'
import {
  srcSourceDocuments,
  srcStatistics,
  srcTestimonials,
  srcStories,
  srcOwnResearch,
} from '@/lib/db/schema/source'
import { graphNodes } from '@/lib/db/schema/graph'
import { generateEmbedding } from '@/lib/llm/embeddings'
import { getSearchableTables, type EmbeddableTableConfig } from './registry'
import type { RetrievalResult, RetrievalFilters } from './types'

export type EmbeddableTable =
  | 'dna_business_overview'
  | 'dna_brand_meaning'
  | 'dna_value_proposition'
  | 'dna_knowledge_assets'
  | 'dna_tov_samples'
  | 'src_source_documents'
  | 'src_statistics'
  | 'src_testimonials'
  | 'src_stories'
  | 'src_own_research'
  | 'graph_nodes'

export interface SimilarityResult {
  id: string
  score: number
  label: string // human-readable identifier (name, title, or truncated text)
}

export interface FindSimilarOptions {
  limit?: number
  threshold?: number // minimum similarity score (0–1). If omitted, returns top-N regardless.
}

const TABLE_MAP = {
  dna_business_overview: dnaBusinessOverview,
  dna_brand_meaning: dnaBrandMeaning,
  dna_value_proposition: dnaValueProposition,
  dna_knowledge_assets: dnaKnowledgeAssets,
  dna_tov_samples: dnaTovSamples,
  src_source_documents: srcSourceDocuments,
  src_statistics: srcStatistics,
  src_testimonials: srcTestimonials,
  src_stories: srcStories,
  src_own_research: srcOwnResearch,
  graph_nodes: graphNodes,
} as const

/**
 * Find rows in a given table whose embedding is closest to the supplied vector.
 * Uses cosine distance (<=>). Lower distance = higher similarity.
 * Returns results sorted by similarity descending (most similar first).
 */
export async function findSimilar(
  embedding: number[],
  table: EmbeddableTable,
  options: FindSimilarOptions = {}
): Promise<SimilarityResult[]> {
  const { limit = 10, threshold } = options
  const drizzleTable = TABLE_MAP[table]
  const vectorLiteral = `[${embedding.join(',')}]`

  // cosine distance: 0 = identical, 2 = opposite. similarity = 1 - distance.
  const rows = await db.execute(sql`
    SELECT
      id::text,
      (1 - (embedding <=> ${vectorLiteral}::vector)) AS score,
      ${getLabelExpression(table)}                    AS label
    FROM ${drizzleTable}
    WHERE embedding IS NOT NULL
    ${threshold !== undefined ? sql`AND (1 - (embedding <=> ${vectorLiteral}::vector)) >= ${threshold}` : sql``}
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${limit}
  `)

  return (rows as unknown as Array<{ id: string; score: number; label: string }>).map((r) => ({
    id: r.id,
    score: Number(r.score),
    label: r.label,
  }))
}

// ---------------------------------------------------------------------------
// Graph-node-specific similarity search with optional label filtering
// ---------------------------------------------------------------------------

export interface GraphSimilarityResult extends SimilarityResult {
  nodeLabel: string // the graph node label (Idea, Person, etc.)
}

export interface FindSimilarNodesOptions extends FindSimilarOptions {
  /** Filter to specific node types. If omitted, searches all node types. */
  labels?: string[]
  /** Node IDs to exclude from results (e.g. exclude the node being compared) */
  excludeIds?: string[]
}

/**
 * Find graph nodes whose embedding is closest to the supplied vector.
 * Optionally filter by node label (e.g. only Idea nodes, only Person nodes).
 */
export async function findSimilarNodes(
  embedding: number[],
  options: FindSimilarNodesOptions = {}
): Promise<GraphSimilarityResult[]> {
  const { limit = 10, threshold, labels, excludeIds } = options
  const vectorLiteral = `[${embedding.join(',')}]`

  const labelFilter = labels && labels.length > 0
    ? sql`AND label IN (${sql.join(labels.map((l) => sql`${l}`), sql`, `)})`
    : sql``

  const excludeFilter = excludeIds && excludeIds.length > 0
    ? sql`AND id NOT IN (${sql.join(excludeIds.map((id) => sql`${id}`), sql`, `)})`
    : sql``

  const rows = await db.execute(sql`
    SELECT
      id::text,
      (1 - (embedding <=> ${vectorLiteral}::vector)) AS score,
      name AS label,
      label AS node_label
    FROM graph_nodes
    WHERE embedding IS NOT NULL
    ${labelFilter}
    ${excludeFilter}
    ${threshold !== undefined ? sql`AND (1 - (embedding <=> ${vectorLiteral}::vector)) >= ${threshold}` : sql``}
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${limit}
  `)

  return (rows as unknown as Array<{ id: string; score: number; label: string; node_label: string }>).map((r) => ({
    id: r.id,
    score: Number(r.score),
    label: r.label,
    nodeLabel: r.node_label,
  }))
}

// ---------------------------------------------------------------------------
// Cross-table semantic search (RET-01)
// ---------------------------------------------------------------------------

/**
 * Search across all embeddable tables for items semantically similar to the query.
 * Runs queries in parallel, merges, and ranks by similarity score.
 */
export async function searchKnowledge(
  query: string,
  filters?: RetrievalFilters
): Promise<RetrievalResult[]> {
  const limit = Math.min(filters?.limit ?? 10, 50)

  const embedding = await generateEmbedding(query)
  if (!embedding) return []

  const tables = getSearchableTables(filters?.types)
  const results = await Promise.all(
    tables.map((config) => searchTable(embedding, config))
  )

  // Merge and sort by score descending
  const merged = results.flat().sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  return merged.slice(0, limit)
}

/**
 * Search a single table for items semantically similar to the embedding.
 * Returns RetrievalResult[] with scores and source attribution.
 */
async function searchTable(
  embedding: number[],
  config: EmbeddableTableConfig
): Promise<RetrievalResult[]> {
  const vectorLiteral = `[${embedding.join(',')}]`

  const rows = await db.execute(sql`
    SELECT
      id::text,
      (1 - (embedding <=> ${vectorLiteral}::vector)) AS score,
      ${config.labelExpr}  AS label,
      ${config.snippetExpr} AS snippet
      ${config.dateExpr ? sql`, ${config.dateExpr} AS item_date` : sql``}
    FROM ${config.drizzleTable}
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT 10
  `)

  return (rows as unknown as Array<{
    id: string
    score: number
    label: string
    snippet: string | null
    item_date?: string | null
  }>).map((r) => ({
    id: r.id,
    type: config.resultType,
    subtype: config.subtype ?? (config.resultType === 'graph_node' ? 'graph_node' : undefined),
    name: r.label ?? config.key,
    date: r.item_date ?? undefined,
    score: Number(r.score),
    reason: 'semantic match',
    snippet: r.snippet ?? undefined,
  }))
}

// ---------------------------------------------------------------------------
// Legacy per-table helpers (used by findSimilar — kept for backwards compat)
// ---------------------------------------------------------------------------

function getLabelExpression(table: EmbeddableTable): ReturnType<typeof sql> {
  switch (table) {
    case 'dna_business_overview':   return sql`business_name`
    case 'dna_brand_meaning':       return sql`COALESCE(vision, mission, purpose, 'brand meaning')`
    case 'dna_value_proposition':   return sql`COALESCE(core_statement, elevator_pitch, 'value proposition')`
    case 'dna_knowledge_assets':    return sql`name`
    case 'dna_tov_samples':         return sql`LEFT(body, 80)`
    case 'src_source_documents':    return sql`title`
    case 'src_statistics':          return sql`COALESCE(short_label, LEFT(stat, 80))`
    case 'src_testimonials':        return sql`LEFT(quote, 80)`
    case 'src_stories':             return sql`title`
    case 'src_own_research':        return sql`title`
    case 'graph_nodes':             return sql`name`
  }
}
