import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { graphNodes } from '@/lib/db/schema/graph'
import { generateEmbedding } from '@/lib/llm/embeddings'
import type { NodeLabel } from './types'

// ---------------------------------------------------------------------------
// Canonical fuzzy match (Pass 2 layout spec, INP-12 brief §Edge cases)
//
// Two thresholds, tunable on re-ingest day:
//   ≥ 0.92  → strong match (visually emphasised, pre-selected for confirmation)
//   ≥ 0.75  → suggested match (shown as candidate, not pre-selected)
//
// Two scoring inputs:
//   - cosine similarity on embedding when an embedding is computed for the query name
//   - trigram name similarity (pg_trgm) on the canonical_name string itself
// We use whichever score is higher per candidate. Embedding picks up "Will Clouston" → "William Clouston";
// trigram picks up typos and casing differences.
//
// Lazy pre-fetch (Pass 2 review-surface optimisation):
//   getCanonicalMatchCounts(rows) → strong + suggested counts per row, cheap batch query.
//
// Full search:
//   findCanonicalCandidates({ entityType, name }) → ranked candidates with scores.
// ---------------------------------------------------------------------------

export const SIMILARITY_THRESHOLDS = {
  strong: 0.92,
  suggested: 0.75,
} as const

export type SimilarityKind = 'strong' | 'suggested' | 'weak'

export interface MatchCandidate {
  /** graph_nodes.id (same as the FalkorDB node id). */
  id: string
  canonicalName: string
  role?: string
  /** label-specific properties — varies by entity type (e.g. organisation, relationshipTypes). */
  disambiguation?: Record<string, unknown>
  similarityScore: number
  similarityKind: SimilarityKind
}

export interface MatchCounts {
  strong: number
  suggested: number
}

function classify(score: number): SimilarityKind {
  if (score >= SIMILARITY_THRESHOLDS.strong) return 'strong'
  if (score >= SIMILARITY_THRESHOLDS.suggested) return 'suggested'
  return 'weak'
}

/**
 * Find ranked canonical-match candidates for a proposed entity name.
 *
 * Strategy:
 *   1. Generate an embedding for the proposed name (lightweight call).
 *   2. Query graph_nodes filtered by `label = entityType`.
 *   3. Score each row by max(cosine-similarity-from-embedding, trigram-similarity-on-name).
 *   4. Return rows whose top score crosses the suggested threshold, sorted desc by score.
 *
 * Returns at most `limit` candidates.
 */
export async function findCanonicalCandidates({
  entityType,
  name,
  limit = 8,
}: {
  entityType: NodeLabel
  name: string
  limit?: number
}): Promise<MatchCandidate[]> {
  const trimmed = name.trim()
  if (!trimmed) return []

  const queryEmbedding = await generateEmbedding(trimmed)

  // pgvector cosine similarity: 1 - (a <=> b). Trigram similarity is `similarity(a, b)`.
  // Take the greater of the two scores per row.
  const rows = await db.execute<{
    id: string
    name: string
    properties: Record<string, unknown> | null
    embedding_score: number
    trigram_score: number
    score: number
  }>(sql`
    SELECT
      ${graphNodes.id}                                                  AS id,
      ${graphNodes.name}                                                AS name,
      ${graphNodes.properties}                                          AS properties,
      ${queryEmbedding
        ? sql`COALESCE(1 - (${graphNodes.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector), 0)`
        : sql`0`} AS embedding_score,
      similarity(${graphNodes.name}, ${trimmed})                        AS trigram_score,
      GREATEST(
        ${queryEmbedding
          ? sql`COALESCE(1 - (${graphNodes.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector), 0)`
          : sql`0`},
        similarity(${graphNodes.name}, ${trimmed})
      ) AS score
    FROM ${graphNodes}
    WHERE ${graphNodes.label} = ${entityType}
    ORDER BY score DESC
    LIMIT ${limit}
  `)

  return rows.rows
    .filter((row) => Number(row.score) >= SIMILARITY_THRESHOLDS.suggested)
    .map((row): MatchCandidate => {
      const props = (row.properties ?? {}) as Record<string, unknown>
      return {
        id: row.id,
        canonicalName: row.name,
        role: typeof props.role === 'string' ? props.role : undefined,
        disambiguation: props,
        similarityScore: Number(row.score),
        similarityKind: classify(Number(row.score)),
      }
    })
}

/**
 * Batch count of strong + suggested matches per row, for Pass 2's lazy pre-fetch.
 * Input rows pair each Person/Org item with a stable `rowKey` so the caller can map results.
 * Embeddings are computed in parallel; one count query per row.
 */
export async function getCanonicalMatchCounts(
  rows: Array<{ rowKey: string; entityType: NodeLabel; name: string }>,
): Promise<Record<string, MatchCounts>> {
  if (rows.length === 0) return {}

  // Compute embeddings concurrently.
  const embeddings = await Promise.all(rows.map((row) => generateEmbedding(row.name.trim())))

  // Run one parameterised count per row. For v1 volumes (≤20 rows per review) this is
  // acceptable; a single CTE-with-VALUES query is a v2 optimisation.
  const results = await Promise.all(rows.map(async (row, i) => {
    const embedding = embeddings[i]
    const trimmed = row.name.trim()
    if (!trimmed) return [row.rowKey, { strong: 0, suggested: 0 }] as const

    const result = await db.execute<{ strong: number; suggested: number }>(sql`
      WITH scored AS (
        SELECT
          GREATEST(
            ${embedding
              ? sql`COALESCE(1 - (${graphNodes.embedding} <=> ${JSON.stringify(embedding)}::vector), 0)`
              : sql`0`},
            similarity(${graphNodes.name}, ${trimmed})
          ) AS score
        FROM ${graphNodes}
        WHERE ${graphNodes.label} = ${row.entityType}
      )
      SELECT
        COUNT(*) FILTER (WHERE score >= ${SIMILARITY_THRESHOLDS.strong})::int    AS strong,
        COUNT(*) FILTER (WHERE score >= ${SIMILARITY_THRESHOLDS.suggested}
                           AND score <  ${SIMILARITY_THRESHOLDS.strong})::int    AS suggested
      FROM scored
    `)

    const fst = result.rows?.[0] ?? { strong: 0, suggested: 0 }
    return [row.rowKey, { strong: Number(fst.strong), suggested: Number(fst.suggested) }] as const
  }))

  return Object.fromEntries(results)
}
