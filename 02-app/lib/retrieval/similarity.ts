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
  }
}
