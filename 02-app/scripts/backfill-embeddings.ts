/**
 * One-time script to backfill embeddings for graph_nodes and processing_runs
 * where embedding IS NULL.
 *
 * Usage: npx tsx scripts/backfill-embeddings.ts
 *
 * Rate-limited to 5 concurrent embedding generations to avoid Gemini API limits.
 */

import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { graphNodes } from '@/lib/db/schema/graph'
import { processingRuns } from '@/lib/db/schema/inputs/processing-runs'
import { generateEmbedding } from '@/lib/llm/embeddings'

const CONCURRENCY = 5

async function backfillGraphNodes() {
  const rows = await db.execute(sql`
    SELECT id, name, description FROM graph_nodes WHERE embedding IS NULL
  `) as unknown as Array<{ id: string; name: string; description: string | null }>

  console.log(`Graph nodes to backfill: ${rows.length}`)
  if (rows.length === 0) return

  let done = 0
  let failed = 0

  // Process in batches of CONCURRENCY
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY)
    await Promise.all(
      batch.map(async (row) => {
        try {
          const text = `${row.name} — ${row.description ?? ''}`
          const embedding = await generateEmbedding(text)
          if (embedding) {
            const vectorLiteral = `[${embedding.join(',')}]`
            await db.execute(
              sql`UPDATE graph_nodes SET embedding = ${vectorLiteral}::vector WHERE id = ${row.id}`
            )
            done++
          } else {
            failed++
          }
        } catch (err) {
          console.error(`Failed to embed node ${row.id}:`, err)
          failed++
        }
      })
    )
    console.log(`  Graph nodes: ${done + failed}/${rows.length} (${done} ok, ${failed} failed)`)
  }

  console.log(`Graph nodes complete: ${done} embedded, ${failed} failed`)
}

async function backfillProcessingRuns() {
  const rows = await db.execute(sql`
    SELECT id, title, mode, analysis_result FROM processing_runs
    WHERE embedding IS NULL AND (analysis_result IS NOT NULL OR title IS NOT NULL)
  `) as unknown as Array<{
    id: string
    title: string | null
    mode: string
    analysis_result: unknown
  }>

  console.log(`Processing runs to backfill: ${rows.length}`)
  if (rows.length === 0) return

  let done = 0
  let failed = 0

  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY)
    await Promise.all(
      batch.map(async (row) => {
        try {
          const analysisText = row.analysis_result
            ? JSON.stringify(row.analysis_result).slice(0, 32000)
            : ''
          const text = `${row.title ?? row.mode + ' analysis'} — ${analysisText}`
          const embedding = await generateEmbedding(text)
          if (embedding) {
            const vectorLiteral = `[${embedding.join(',')}]`
            await db.execute(
              sql`UPDATE processing_runs SET embedding = ${vectorLiteral}::vector WHERE id = ${row.id}`
            )
            done++
          } else {
            failed++
          }
        } catch (err) {
          console.error(`Failed to embed processing run ${row.id}:`, err)
          failed++
        }
      })
    )
    console.log(`  Processing runs: ${done + failed}/${rows.length} (${done} ok, ${failed} failed)`)
  }

  console.log(`Processing runs complete: ${done} embedded, ${failed} failed`)
}

async function main() {
  console.log('Backfill embeddings — starting\n')
  await backfillGraphNodes()
  console.log()
  await backfillProcessingRuns()
  console.log('\nDone.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
