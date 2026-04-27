import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { graphNodes } from '@/lib/db/schema/graph'
import { sql } from 'drizzle-orm'
import { neon } from '@neondatabase/serverless'
import { generateEmbedding } from '@/lib/llm/embeddings'

const SKIP_LABELS = ['Date', 'Country']
const BATCH_SIZE = 5

/**
 * POST /api/admin/backfill-embeddings
 * One-time backfill: generate embeddings for all graph nodes that don't have one.
 * Skips Date and Country nodes (structural, not semantic).
 */
export async function POST() {
  try {
    const rows = await db
      .select({
        id: graphNodes.id,
        label: graphNodes.label,
        name: graphNodes.name,
        description: graphNodes.description,
        properties: graphNodes.properties,
      })
      .from(graphNodes)
      .where(
        sql`${graphNodes.embedding} IS NULL AND ${graphNodes.label} NOT IN (${sql.join(SKIP_LABELS.map((l) => sql`${l}`), sql`, `)})`
      )

    let updated = 0
    let skipped = 0
    const errors: string[] = []

    // Process in batches
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)
      await Promise.all(
        batch.map(async (row) => {
          const text = composeEmbeddingText(row)
          if (!text) {
            skipped++
            return
          }
          try {
            const embedding = await generateEmbedding(text)
            if (embedding) {
              const vec = `[${embedding.join(',')}]`
              const sqlClient = neon(process.env.DATABASE_URL!)
              await sqlClient`UPDATE graph_nodes SET embedding = ${vec}::vector WHERE id = ${row.id}`
              updated++
            } else {
              skipped++
            }
          } catch (err) {
            errors.push(`${row.label}:${row.name}: ${err instanceof Error ? err.message : String(err)}`)
          }
        })
      )
    }

    return NextResponse.json({
      total: rows.length,
      updated,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    console.error('[POST /api/admin/backfill-embeddings]', err)
    return NextResponse.json(
      { error: 'Backfill failed' },
      { status: 500 }
    )
  }
}

function composeEmbeddingText(row: {
  label: string
  name: string
  description: string | null
  properties: unknown
}): string | null {
  const props = row.properties as Record<string, unknown> | null

  switch (row.label) {
    case 'Idea':
      return row.description ?? row.name
    case 'Concept':
    case 'Methodology':
      return row.description ? `${row.name}: ${row.description}` : row.name
    case 'Person': {
      const parts = [row.name]
      if (props?.role) parts.push(String(props.role))
      if (props?.organisation) parts.push(`at ${props.organisation}`)
      if (row.description) parts.push(row.description)
      return parts.join(', ')
    }
    case 'Organisation':
      return row.description ? `${row.name}. ${row.description}` : row.name
    case 'SourceDocument':
      return row.description ? `${row.name}. ${row.description}` : row.name
    case 'Event':
    case 'Project':
    case 'Mission':
    case 'Vertical':
      return row.description ? `${row.name}: ${row.description}` : row.name
    default:
      return row.description ? `${row.name}: ${row.description}` : row.name
  }
}
