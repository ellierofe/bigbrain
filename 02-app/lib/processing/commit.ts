import { randomUUID } from 'crypto'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { neon } from '@neondatabase/serverless'
import { srcSourceDocuments, srcStories } from '@/lib/db/schema/source'
import { writeNode, writeEdge } from '@/lib/graph/write'
import { resolveCanonical } from '@/lib/graph/canonical'
import { generateEmbedding } from '@/lib/llm/embeddings'
import {
  type ExtractionResult,
  type CommitResult,
  type CommitCounts,
  type StorySubject,
} from '@/lib/types/processing'

// ---------------------------------------------------------------------------
// commitExtraction
// ---------------------------------------------------------------------------

/**
 * Commit confirmed extracted items to storage.
 *
 * Write order:
 *   1. src_source_documents row (Postgres)
 *   2. SourceDocument graph node (FalkorDB + Neon mirror)
 *   3. Item graph nodes per confirmed extraction
 *   4. src_stories rows for confirmed Story items
 *   5. DERIVED_FROM edges: item nodes → SourceDocument
 *   6. MENTIONS edges: SourceDocument → Person/Organisation nodes
 *   7. Temporal edges: all item nodes → Date node (ON_DATE / IN_MONTH / IN_YEAR)
 *   8. Embeddings: src_source_documents + src_stories
 *
 * @param result        Full ExtractionResult from extractFromText()
 * @param confirmedIds  IDs the user confirmed in the UI (unchecked items are skipped)
 * @param storySubjects Map of story id → subject value ('self'|'client'|'business'|'project')
 */
export async function commitExtraction(
  result: ExtractionResult,
  confirmedIds: string[],
  storySubjects: Record<string, StorySubject> = {}
): Promise<CommitResult> {
  const confirmedSet = new Set(confirmedIds)
  const errors: string[] = []
  const counts: CommitCounts = {
    sourceDocument: 0,
    ideas: 0,
    concepts: 0,
    people: 0,
    organisations: 0,
    stories: 0,
    techniques: 0,
    contentAngles: 0,
    edges: 0,
    embeddings: 0,
  }

  const { metadata, text, extraction } = result
  const sourceId = randomUUID()
  const source = 'INP_03'

  // ---------------------------------------------------------------------------
  // 1. Write src_source_documents row
  // ---------------------------------------------------------------------------
  let sourceDocRowId: string | null = null
  try {
    const [row] = await db
      .insert(srcSourceDocuments)
      .values({
        id: sourceId,
        brandId: metadata.brandId,
        title: metadata.title,
        type: metadata.sourceType,
        fileUrl: metadata.fileRef ?? null,
        extractedText: text,
        documentDate: metadata.date ?? null,
        tags: metadata.tags ?? [],
      })
      .returning({ id: srcSourceDocuments.id })
    sourceDocRowId = row.id
    counts.sourceDocument = 1
  } catch (err) {
    errors.push(`source_document row: ${err instanceof Error ? err.message : String(err)}`)
    // If we can't write the source document, abort — no orphaned nodes
    return { success: false, counts, errors }
  }

  // ---------------------------------------------------------------------------
  // 2. Write SourceDocument graph node
  // ---------------------------------------------------------------------------
  const sourceDocNodeId = sourceId // reuse the Postgres uuid as the graph node id
  const sourceDocResult = await writeNode({
    id: sourceDocNodeId,
    label: 'SourceDocument',
    name: metadata.title,
    description: `Source document: ${metadata.title}. Type: ${metadata.sourceType}.`,
    source,
    fileRef: metadata.fileRef,
  })
  if (!sourceDocResult.success) {
    errors.push(`SourceDocument graph node: ${sourceDocResult.error}`)
  }

  // ---------------------------------------------------------------------------
  // Resolve the date node id to use for temporal edges
  // ---------------------------------------------------------------------------
  const dateStr = metadata.date ?? new Date().toISOString().slice(0, 10)
  const [year, month] = dateStr.split('-')
  const yearValue = year
  const monthValue = `${year}-${month}`
  const dayValue = dateStr

  // Date node ids were set by randomUUID() in the seed script, not predictable.
  // We look up by value property in FalkorDB via the Neon mirror (graph_nodes).
  const { graphNodes } = await import('@/lib/db/schema/graph')

  async function getDateNodeId(level: 'year' | 'month' | 'day', value: string): Promise<string | null> {
    const rows = await db
      .select({ id: graphNodes.id })
      .from(graphNodes)
      .where(
        sql`${graphNodes.label} = 'Date' AND ${graphNodes.properties}->>'level' = ${level} AND ${graphNodes.name} = ${value}`
      )
      .limit(1)
    return rows[0]?.id ?? null
  }

  const [dayNodeId, monthNodeId, yearNodeId] = await Promise.all([
    getDateNodeId('day', dayValue),
    getDateNodeId('month', monthValue),
    getDateNodeId('year', yearValue),
  ])

  // ---------------------------------------------------------------------------
  // 3–7. Process each extraction type
  // ---------------------------------------------------------------------------

  // Collect all confirmed node ids for temporal edges
  const confirmedNodeIds: string[] = []
  // Collect embedding text for each node (keyed by nodeId)
  const nodeEmbeddingTexts: Map<string, string> = new Map()

  // Helper: write a node and collect its id if successful
  async function writeAndCollect(
    nodeInput: Parameters<typeof writeNode>[0],
    countKey: keyof CommitCounts
  ): Promise<string | null> {
    const r = await writeNode(nodeInput)
    if (r.success) {
      counts[countKey] = (counts[countKey] as number) + 1
      confirmedNodeIds.push(nodeInput.id)
      return nodeInput.id
    } else {
      errors.push(`${nodeInput.label} node ${nodeInput.name}: ${r.error}`)
      return null
    }
  }

  // Helper: write DERIVED_FROM edge
  async function writeDerivedFrom(fromNodeId: string) {
    const r = await writeEdge({
      fromNodeId,
      toNodeId: sourceDocNodeId,
      relationshipType: 'DERIVED_FROM',
      description: `Node derived from source document "${metadata.title}".`,
      source,
    })
    if (r.success) counts.edges++
    else errors.push(`DERIVED_FROM edge ${fromNodeId}: ${r.error}`)
  }

  // Ideas
  for (const idea of extraction.ideas.filter((i) => confirmedSet.has(i.id))) {
    const nodeId = await writeAndCollect(
      {
        id: idea.id,
        label: 'Idea',
        name: idea.text.slice(0, 200),
        description: idea.text,
        source,
        properties: {
          sourceQuote: idea.sourceQuote ?? null,
          confidence: idea.confidence,
          subtype: 'idea',
        },
      },
      'ideas'
    )
    if (nodeId) {
      await writeDerivedFrom(nodeId)
      nodeEmbeddingTexts.set(nodeId, idea.text)
    }
  }

  // Concepts
  for (const concept of extraction.concepts.filter((c) => confirmedSet.has(c.id))) {
    const nodeId = await writeAndCollect(
      {
        id: concept.id,
        label: 'Concept',
        name: concept.name,
        description: concept.description,
        source,
        properties: {
          sourceQuote: concept.sourceQuote ?? null,
          confidence: concept.confidence,
        },
      },
      'concepts'
    )
    if (nodeId) {
      await writeDerivedFrom(nodeId)
      nodeEmbeddingTexts.set(nodeId, `${concept.name}: ${concept.description}`)
    }
  }

  // People — resolve canonical first
  for (const person of extraction.people.filter((p) => confirmedSet.has(p.id))) {
    const existingId = await resolveCanonical('Person', person.name)
    const nodeId = existingId ?? person.id

    const r = await writeNode({
      id: nodeId,
      label: 'Person',
      name: person.name,
      description: person.context,
      source,
      properties: {
        role: person.role ?? null,
        organisation: person.organisation ?? null,
        confidence: person.confidence,
      },
    })
    if (r.success) {
      counts.people++
      confirmedNodeIds.push(nodeId)
      const personParts = [person.name]
      if (person.role) personParts.push(person.role)
      if (person.organisation) personParts.push(`at ${person.organisation}`)
      personParts.push(person.context)
      nodeEmbeddingTexts.set(nodeId, personParts.join(', '))

      // MENTIONS edge: SourceDocument → Person
      const mentionsR = await writeEdge({
        fromNodeId: sourceDocNodeId,
        toNodeId: nodeId,
        relationshipType: 'MENTIONS',
        description: `${metadata.title} mentions ${person.name}.`,
        source,
      })
      if (mentionsR.success) counts.edges++
      else errors.push(`MENTIONS edge for ${person.name}: ${mentionsR.error}`)
    } else {
      errors.push(`Person node ${person.name}: ${r.error}`)
    }
  }

  // Organisations — resolve canonical first
  for (const org of extraction.organisations.filter((o) => confirmedSet.has(o.id))) {
    const existingId = await resolveCanonical('Organisation', org.name)
    const nodeId = existingId ?? org.id

    const r = await writeNode({
      id: nodeId,
      label: 'Organisation',
      name: org.name,
      description: org.context,
      source,
      properties: {
        types: org.types ?? null,
        confidence: org.confidence,
      },
    })
    if (r.success) {
      counts.organisations++
      confirmedNodeIds.push(nodeId)
      nodeEmbeddingTexts.set(nodeId, `${org.name}. ${org.context}`)

      const mentionsR = await writeEdge({
        fromNodeId: sourceDocNodeId,
        toNodeId: nodeId,
        relationshipType: 'MENTIONS',
        description: `${metadata.title} mentions ${org.name}.`,
        source,
      })
      if (mentionsR.success) counts.edges++
      else errors.push(`MENTIONS edge for ${org.name}: ${mentionsR.error}`)
    } else {
      errors.push(`Organisation node ${org.name}: ${r.error}`)
    }
  }

  // Stories — write graph node + src_stories row
  const confirmedStories = extraction.stories.filter((s) => confirmedSet.has(s.id))
  const storyRowIds: { storyId: string; narrative: string }[] = []

  for (const story of confirmedStories) {
    // No graph node for stories in v1 (Postgres only per brief)
    counts.stories++

    const subject = storySubjects[story.id] ?? 'self'
    try {
      const [row] = await db
        .insert(srcStories)
        .values({
          brandId: metadata.brandId,
          title: story.title,
          subject,
          narrative: story.narrative,
          hook: story.hook ?? null,
          lesson: story.lesson ?? null,
          type: story.type ?? 'other',
        })
        .returning({ id: srcStories.id })
      storyRowIds.push({ storyId: row.id, narrative: story.narrative })
    } catch (err) {
      errors.push(`src_stories row "${story.title}": ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Techniques
  for (const technique of extraction.techniques.filter((t) => confirmedSet.has(t.id))) {
    const nodeId = await writeAndCollect(
      {
        id: technique.id,
        label: 'Methodology',
        name: technique.name,
        description: technique.description,
        source,
        properties: {
          origin: technique.origin ?? null,
          sourceQuote: technique.sourceQuote ?? null,
          confidence: technique.confidence,
        },
      },
      'techniques'
    )
    if (nodeId) {
      await writeDerivedFrom(nodeId)
      nodeEmbeddingTexts.set(nodeId, `${technique.name}: ${technique.description}`)
    }
  }

  // Content angles — written as Idea nodes with subtype: 'content-angle'
  for (const angle of extraction.contentAngles.filter((a) => confirmedSet.has(a.id))) {
    const nodeId = await writeAndCollect(
      {
        id: angle.id,
        label: 'Idea',
        name: angle.angle.slice(0, 200),
        description: angle.angle,
        source,
        properties: {
          subtype: 'content-angle',
          format: angle.format ?? null,
          audienceHint: angle.audienceHint ?? null,
          confidence: angle.confidence,
        },
      },
      'contentAngles'
    )
    if (nodeId) {
      await writeDerivedFrom(nodeId)
      nodeEmbeddingTexts.set(nodeId, angle.angle)
    }
  }

  // ---------------------------------------------------------------------------
  // 7. Temporal edges — all confirmed nodes → Date nodes
  // ---------------------------------------------------------------------------
  for (const nodeId of confirmedNodeIds) {
    if (dayNodeId) {
      const r = await writeEdge({
        fromNodeId: nodeId,
        toNodeId: dayNodeId,
        relationshipType: 'ON_DATE',
        description: `Node associated with date ${dayValue}.`,
        source,
      })
      if (r.success) counts.edges++
      else errors.push(`ON_DATE edge for ${nodeId}: ${r.error}`)
    }
    if (monthNodeId) {
      const r = await writeEdge({
        fromNodeId: nodeId,
        toNodeId: monthNodeId,
        relationshipType: 'IN_MONTH',
        description: `Node associated with month ${monthValue}.`,
        source,
      })
      if (r.success) counts.edges++
    }
    if (yearNodeId) {
      const r = await writeEdge({
        fromNodeId: nodeId,
        toNodeId: yearNodeId,
        relationshipType: 'IN_YEAR',
        description: `Node associated with year ${yearValue}.`,
        source,
      })
      if (r.success) counts.edges++
    }
  }

  // ---------------------------------------------------------------------------
  // 8. Embeddings
  // ---------------------------------------------------------------------------

  // src_source_documents embedding
  if (sourceDocRowId && text) {
    try {
      const embedding = await generateEmbedding(text)
      if (embedding) {
        const vec = `[${embedding.join(',')}]`
        const sqlClient = neon(process.env.DATABASE_URL!)
        await sqlClient`UPDATE src_source_documents SET embedding = ${vec}::vector WHERE id = ${sourceDocRowId}`
        counts.embeddings++
      }
    } catch (err) {
      errors.push(`embedding for source document: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // src_stories embeddings
  for (const { storyId, narrative } of storyRowIds) {
    try {
      const embedding = await generateEmbedding(narrative)
      if (embedding) {
        const vec = `[${embedding.join(',')}]`
        const sqlClient = neon(process.env.DATABASE_URL!)
        await sqlClient`UPDATE src_stories SET embedding = ${vec}::vector WHERE id = ${storyId}`
        counts.embeddings++
      }
    } catch (err) {
      errors.push(`embedding for story ${storyId}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // graph_nodes embeddings — embed all confirmed graph nodes for similarity search
  for (const nodeId of confirmedNodeIds) {
    try {
      const embeddingText = nodeEmbeddingTexts.get(nodeId)
      if (!embeddingText) continue
      const embedding = await generateEmbedding(embeddingText)
      if (embedding) {
        const vec = `[${embedding.join(',')}]`
        const sqlClient = neon(process.env.DATABASE_URL!)
        await sqlClient`UPDATE graph_nodes SET embedding = ${vec}::vector WHERE id = ${nodeId}`
        counts.embeddings++
      }
    } catch (err) {
      errors.push(`embedding for graph node ${nodeId}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Also embed the SourceDocument graph node
  if (sourceDocResult.success && text) {
    try {
      const embedding = await generateEmbedding(`${metadata.title}. ${text.slice(0, 2000)}`)
      if (embedding) {
        const vec = `[${embedding.join(',')}]`
        const sqlClient = neon(process.env.DATABASE_URL!)
        await sqlClient`UPDATE graph_nodes SET embedding = ${vec}::vector WHERE id = ${sourceDocNodeId}`
        counts.embeddings++
      }
    } catch (err) {
      errors.push(`embedding for SourceDocument graph node: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return {
    success: errors.length === 0,
    counts,
    errors,
  }
}
