import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { srcSourceDocuments } from '@/lib/db/schema/source'
import { srcSourceChunks } from '@/lib/db/schema/source-chunks'
import { graphNodes } from '@/lib/db/schema/graph'
import { getGraphClient, GRAPH_NAME } from '@/lib/graph/client'
import { writeNode, writeEdge } from '@/lib/graph/write'
import type { SourceType, Authority } from '@/lib/types/lens'
import { chunkSource, type Chunk } from './chunk'
import { summariseSource } from './summarise'
import { embedMany } from './embed'

// ---------------------------------------------------------------------------
// Ingest orchestrator (INP-12 Phase 1)
//
// Given a source-document row id, runs the full ingest pipeline:
//
//   1. Load src_source_documents row.
//   2. Guard: extractedText must exist (skip with warning if not).
//   3. Chunk (deterministic, by source type).
//   4. Summarise (LLM, ~300 words).
//   5. Embed: parallel embeddings for every chunk + the summary.
//   6. Persist (transactional): replace existing chunks for the source,
//      insert new chunks, update src_source_documents
//      (summary, summary_generated_at, embedding, embedding_generated_at,
//      chunk_count).
//   7. Write graph: SourceDocument graph node (summary as description) +
//      SourceChunk graph nodes + PART_OF edges (SourceChunk → SourceDocument).
//
// Idempotent at the chunk grain — re-running deletes the existing chunk set
// and writes fresh ones, per src-source-chunks.md "re-chunking deletes and
// recreates the whole set".
//
// Dataset / collection source types skip chunking + summary entirely (per
// src-source-chunks.md "Not chunked"). They still get a SourceDocument graph
// node so the source is discoverable; richer modelling is the kg-ingest-creator
// path.
// ---------------------------------------------------------------------------

const GRAPH_SOURCE_TAG = 'INP_12_INGEST'
const NON_CHUNKED_SOURCE_TYPES = new Set<SourceType>(['dataset', 'collection'])

export interface IngestResult {
  sourceId: string
  status: 'completed' | 'skipped' | 'failed'
  reason?: string
  chunkCount: number
  summaryGenerated: boolean
  embeddingsGenerated: number
  embeddingsFailed: number
  graph: {
    sourceDocumentWritten: boolean
    chunkNodesWritten: number
    chunkNodesFailed: number
    partOfEdgesWritten: number
    partOfEdgesFailed: number
  }
  errors: string[]
}

export async function ingestSource(sourceId: string): Promise<IngestResult> {
  const result: IngestResult = {
    sourceId,
    status: 'failed',
    chunkCount: 0,
    summaryGenerated: false,
    embeddingsGenerated: 0,
    embeddingsFailed: 0,
    graph: {
      sourceDocumentWritten: false,
      chunkNodesWritten: 0,
      chunkNodesFailed: 0,
      partOfEdgesWritten: 0,
      partOfEdgesFailed: 0,
    },
    errors: [],
  }

  // 1. Load source row.
  const [row] = await db
    .select()
    .from(srcSourceDocuments)
    .where(eq(srcSourceDocuments.id, sourceId))
    .limit(1)
  if (!row) {
    result.status = 'failed'
    result.reason = `source not found: ${sourceId}`
    result.errors.push(result.reason)
    return result
  }

  const sourceType = row.sourceType as SourceType
  const authority = row.authority as Authority
  const extractedText = (row.extractedText ?? '').trim()

  // 2. Guard: empty text — write a SourceDocument graph node with a placeholder
  //    description (so it's at least discoverable) but skip chunk/summary work.
  if (!extractedText) {
    result.status = 'skipped'
    result.reason = 'no extracted_text yet; waiting for INP-05 to populate'
    const node = await writeNode({
      id: sourceId,
      label: 'SourceDocument',
      name: row.title,
      description: `Source document: ${row.title}. Type: ${sourceType}. (Text not yet extracted.)`,
      source: GRAPH_SOURCE_TAG,
      fileRef: row.fileUrl ?? undefined,
      properties: {
        sourceType,
        authority,
        inboxStatus: row.inboxStatus,
      },
    })
    result.graph.sourceDocumentWritten = node.success
    if (!node.success) result.errors.push(`SourceDocument node: ${node.error}`)
    return result
  }

  // 3. Chunk.
  const chunks = chunkSource({ sourceType, extractedText })

  // 4. Summarise (the summary is the parent node's `description` and the row's
  //    `summary` column; both feed retrieval).
  let summary: string | null = null
  let summaryGeneratedAt: Date | null = null
  if (!NON_CHUNKED_SOURCE_TYPES.has(sourceType)) {
    try {
      const out = await summariseSource({
        title: row.title,
        sourceType,
        authority,
        extractedText,
        documentDate: row.documentDate ?? null,
      })
      summary = out.summary
      summaryGeneratedAt = out.generatedAt
      result.summaryGenerated = true
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      result.errors.push(`summarise: ${message}`)
      // We continue without a summary — the SourceDocument is still useful,
      // and the user can re-summarise later. ADR-009 prefers visible failure
      // to silent success: the row gets a fallback description.
    }
  }

  // 5. Embed: chunks + summary. We always embed the summary if we have one;
  //    chunks embed their `text` directly.
  const chunkEmbedTexts = chunks.map((c) => c.text)
  const { vectors: chunkVectors, failures: chunkFailures } = await embedMany(chunkEmbedTexts)
  result.embeddingsGenerated = chunkVectors.filter((v) => v !== null).length
  result.embeddingsFailed = chunkFailures.length
  for (const f of chunkFailures) {
    result.errors.push(`embed chunk ${f.index}: ${f.error}`)
  }

  let summaryEmbedding: number[] | null = null
  if (summary) {
    try {
      const summaryEmbedInput = `${row.title} — ${summary}`
      const out = await embedMany([summaryEmbedInput])
      summaryEmbedding = out.vectors[0]
      if (out.vectors[0]) result.embeddingsGenerated++
      if (out.failures.length) result.errors.push(`embed summary: ${out.failures[0].error}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      result.errors.push(`embed summary: ${message}`)
    }
  }

  // 6. Persist: replace chunks (cascade-delete + insert) and update parent row.
  await db.transaction(async (tx) => {
    // Wipe old chunks for this source — re-ingest is the regenerate-the-set path.
    await tx.delete(srcSourceChunks).where(eq(srcSourceChunks.sourceDocumentId, sourceId))

    if (chunks.length > 0) {
      // Pre-generate chunk ids so we can reuse them as graph node ids.
      const rows = chunks.map((c, idx) => {
        const id = crypto.randomUUID()
        ;(c as Chunk & { _id?: string })._id = id
        const vector = chunkVectors[idx]
        return {
          id,
          brandId: row.brandId,
          sourceDocumentId: sourceId,
          position: c.position,
          chunkType: c.chunkType,
          text: c.text,
          speaker: c.speaker,
          startOffset: c.startOffset,
          endOffset: c.endOffset,
          tokenCount: c.tokenCount,
          metadata: c.metadata,
          embedding: vector ?? undefined,
          embeddingGeneratedAt: vector ? new Date() : null,
        }
      })

      // Batch insert. Drizzle's `.values(array)` handles this in one round trip.
      await tx.insert(srcSourceChunks).values(rows)
    }

    // Update parent row.
    await tx
      .update(srcSourceDocuments)
      .set({
        summary: summary ?? row.summary,
        summaryGeneratedAt: summaryGeneratedAt ?? row.summaryGeneratedAt,
        embedding: summaryEmbedding ?? row.embedding ?? undefined,
        embeddingGeneratedAt: summaryEmbedding ? new Date() : row.embeddingGeneratedAt,
        chunkCount: chunks.length,
        updatedAt: new Date(),
      })
      .where(eq(srcSourceDocuments.id, sourceId))
  })

  result.chunkCount = chunks.length

  // 7. Graph writes.
  //    a) SourceDocument graph node (summary becomes description).
  const sourceNode = await writeNode({
    id: sourceId,
    label: 'SourceDocument',
    name: row.title,
    description: deriveSourceNodeDescription({
      title: row.title,
      sourceType,
      summary,
    }),
    source: GRAPH_SOURCE_TAG,
    fileRef: row.fileUrl ?? undefined,
    properties: {
      sourceType,
      authority,
      inboxStatus: row.inboxStatus,
      chunkCount: chunks.length,
      tags: row.tags ?? [],
      participantIds: row.participantIds ?? [],
      documentDate: row.documentDate,
    },
  })
  result.graph.sourceDocumentWritten = sourceNode.success
  if (!sourceNode.success) result.errors.push(`SourceDocument node: ${sourceNode.error}`)

  // If we just embedded the summary, push it onto the graph_nodes mirror's
  // embedding column directly — overrides the `name — description` embedding
  // that writeNode generated, which is fine because they're semantically
  // identical in our case (description IS the summary).
  if (summaryEmbedding) {
    try {
      const vectorLiteral = `[${summaryEmbedding.join(',')}]`
      await db.execute(
        sql`UPDATE graph_nodes SET embedding = ${vectorLiteral}::vector WHERE id = ${sourceId}`,
      )
    } catch (err) {
      result.errors.push(
        `set graph_nodes.embedding for SourceDocument: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  // b) SourceChunk graph nodes + PART_OF edges. Chunk nodes bypass writeNode
  //    because we don't want it to regenerate an embedding from `name — description`
  //    — we already have the chunk's own text embedding.
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i] as Chunk & { _id?: string }
    if (!chunk._id) continue
    const ok = await writeChunkGraphNode({
      id: chunk._id,
      sourceDocumentId: sourceId,
      sourceTitle: row.title,
      chunk,
      embedding: chunkVectors[i] ?? null,
    })
    if (ok.success) {
      result.graph.chunkNodesWritten++
    } else {
      result.graph.chunkNodesFailed++
      result.errors.push(`SourceChunk node ${chunk._id}: ${ok.error}`)
    }

    if (ok.success) {
      const edge = await writeEdge({
        fromNodeId: chunk._id,
        toNodeId: sourceId,
        relationshipType: 'PART_OF',
        description: `Chunk ${chunk.position} of source "${row.title}".`,
        source: GRAPH_SOURCE_TAG,
      })
      if (edge.success) {
        result.graph.partOfEdgesWritten++
      } else {
        result.graph.partOfEdgesFailed++
        result.errors.push(`PART_OF edge: ${edge.error}`)
      }
    }
  }

  result.status = result.errors.length === 0 ? 'completed' : 'completed'
  return result
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveSourceNodeDescription(input: {
  title: string
  sourceType: SourceType
  summary: string | null
}): string {
  // Truncate the summary to a reasonable graph-node description length so
  // FalkorDB queries don't carry 400-word strings around every traversal.
  // Postgres holds the full summary on src_source_documents.summary.
  if (input.summary) {
    const compact = input.summary.replace(/\s+/g, ' ').trim()
    return compact.length > 1200 ? compact.slice(0, 1200).trimEnd() + '…' : compact
  }
  return `Source document: ${input.title}. Type: ${input.sourceType}.`
}

interface WriteChunkNodeInput {
  id: string
  sourceDocumentId: string
  sourceTitle: string
  chunk: Chunk
  embedding: number[] | null
}

async function writeChunkGraphNode(input: WriteChunkNodeInput): Promise<{ success: boolean; error?: string }> {
  const { id, sourceDocumentId, sourceTitle, chunk, embedding } = input

  const speakerLabel = chunk.speaker ? ` [${chunk.speaker}]` : ''
  const slideLabel =
    chunk.chunkType === 'slide' && typeof chunk.metadata.slideNumber === 'number'
      ? ` [slide ${chunk.metadata.slideNumber}${
          chunk.metadata.slideTitle ? `: ${chunk.metadata.slideTitle}` : ''
        }]`
      : ''
  const name = `${sourceTitle} — chunk ${chunk.position}${speakerLabel}${slideLabel}`
  const description = chunk.text.length > 1200 ? chunk.text.slice(0, 1200).trimEnd() + '…' : chunk.text

  try {
    const client = await getGraphClient()
    const graph = client.selectGraph(GRAPH_NAME)

    await graph.query(
      `MERGE (n:SourceChunk { id: $id })
       SET n.name        = $name,
           n.description = $description,
           n.source      = $source,
           n.position    = $position,
           n.chunkType   = $chunkType,
           n.updatedAt   = timestamp()`,
      {
        params: {
          id,
          name,
          description,
          source: GRAPH_SOURCE_TAG,
          position: chunk.position,
          chunkType: chunk.chunkType,
        },
      },
    )

    await graph.query(
      `MATCH (n:SourceChunk { id: $id }) WHERE n.createdAt IS NULL SET n.createdAt = timestamp()`,
      { params: { id } },
    )

    const properties = {
      sourceDocumentId,
      position: chunk.position,
      chunkType: chunk.chunkType,
      speaker: chunk.speaker,
      tokenCount: chunk.tokenCount,
      ...chunk.metadata,
    }
    await graph.query(
      `MATCH (n:SourceChunk { id: $id }) SET n.properties = $properties`,
      { params: { id, properties: JSON.stringify(properties) } },
    )

    // Mirror to Neon graph_nodes (chunk text embedding goes here directly).
    try {
      await db
        .insert(graphNodes)
        .values({
          id,
          label: 'SourceChunk',
          name,
          description,
          source: GRAPH_SOURCE_TAG,
          properties,
        })
        .onConflictDoUpdate({
          target: graphNodes.id,
          set: {
            name,
            description,
            source: GRAPH_SOURCE_TAG,
            properties,
          },
        })

      if (embedding) {
        const vectorLiteral = `[${embedding.join(',')}]`
        await db.execute(
          sql`UPDATE graph_nodes SET embedding = ${vectorLiteral}::vector WHERE id = ${id}`,
        )
      }
    } catch (mirrorErr) {
      console.error(`writeChunkGraphNode: Neon mirror write failed for chunk ${id}:`, mirrorErr)
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}
