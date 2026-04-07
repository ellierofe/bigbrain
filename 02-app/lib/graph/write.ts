import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { graphNodes, graphEdges } from '@/lib/db/schema/graph'
import { getGraphClient, GRAPH_NAME } from './client'
import { registerCanonical } from './canonical'
import { CANONICAL_TYPES, type NodeInput, type EdgeInput, type WriteResult, type BatchWriteResult } from './types'

// ---------------------------------------------------------------------------
// writeNode
// ---------------------------------------------------------------------------

/**
 * Write a single node to FalkorDB and mirror it to Neon graph_nodes.
 * Uses MERGE on id — idempotent, safe to rerun.
 * Auto-registers Person, Organisation, Project nodes in canonical_register.
 */
export async function writeNode(input: NodeInput): Promise<WriteResult> {
  if (!input.description.trim()) {
    throw new Error(`writeNode: description is required and cannot be empty (node id: ${input.id})`)
  }

  try {
    // 1. Write to FalkorDB
    const client = await getGraphClient()
    const graph = client.selectGraph(GRAPH_NAME)

    await graph.query(
      `MERGE (n:${input.label} { id: $id })
       SET n.name        = $name,
           n.description = $description,
           n.source      = $source,
           n.fileRef     = $fileRef,
           n.updatedAt   = timestamp()`,
      {
        params: {
          id: input.id,
          name: input.name,
          description: input.description,
          source: input.source,
          fileRef: input.fileRef ?? null,
        },
      }
    )

    // Set createdAt only on first write (when it doesn't exist yet)
    await graph.query(
      `MATCH (n:${input.label} { id: $id }) WHERE n.createdAt IS NULL SET n.createdAt = timestamp()`,
      { params: { id: input.id } }
    )

    // Store label-specific properties as a single serialised JSON string
    // (FalkorDB doesn't support dynamic property keys via bracket notation)
    if (input.properties && Object.keys(input.properties).length > 0) {
      await graph.query(
        `MATCH (n:${input.label} { id: $id }) SET n.properties = $properties`,
        { params: { id: input.id, properties: JSON.stringify(input.properties) } }
      )
    }

    // 2. Mirror to Neon graph_nodes
    try {
      await db
        .insert(graphNodes)
        .values({
          id: input.id,
          label: input.label,
          name: input.name,
          description: input.description,
          source: input.source,
          fileRef: input.fileRef,
          properties: input.properties ?? null,
        })
        .onConflictDoUpdate({
          target: graphNodes.id,
          set: {
            name: input.name,
            description: input.description,
            source: input.source,
            fileRef: input.fileRef ?? null,
            properties: input.properties ?? null,
          },
        })
    } catch (mirrorErr) {
      // Mirror failure is non-fatal — FalkorDB is authoritative
      console.error(`writeNode: Neon mirror write failed for node ${input.id}:`, mirrorErr)
    }

    // 3. Auto-register canonical for actor types
    if (CANONICAL_TYPES.has(input.label)) {
      try {
        await registerCanonical(input.label, input.name, input.id)
      } catch (canonErr) {
        console.error(`writeNode: canonical registration failed for node ${input.id}:`, canonErr)
      }
    }

    return { success: true, id: input.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, id: input.id, error: message }
  }
}

// ---------------------------------------------------------------------------
// writeEdge
// ---------------------------------------------------------------------------

/**
 * Write a single directed edge to FalkorDB and mirror it to Neon graph_edges.
 * Uses MERGE on (fromNodeId, toNodeId, relationshipType) — idempotent.
 * Both endpoint nodes must exist in FalkorDB before calling this.
 */
export async function writeEdge(input: EdgeInput): Promise<WriteResult> {
  if (!input.description.trim()) {
    throw new Error(
      `writeEdge: description is required and cannot be empty (${input.fromNodeId} → ${input.toNodeId})`
    )
  }

  const edgeId = `${input.fromNodeId}__${input.relationshipType}__${input.toNodeId}`

  try {
    // 1. Write to FalkorDB
    const client = await getGraphClient()
    const graph = client.selectGraph(GRAPH_NAME)

    await graph.query(
      `MATCH (from { id: $fromId }), (to { id: $toId })
       MERGE (from)-[r:${input.relationshipType}]->(to)
       SET r.description = $description,
           r.source      = $source,
           r.updatedAt   = timestamp()`,
      {
        params: {
          fromId: input.fromNodeId,
          toId: input.toNodeId,
          description: input.description,
          source: input.source,
        },
      }
    )

    // Set createdAt only on first write
    await graph.query(
      `MATCH (from { id: $fromId })-[r:${input.relationshipType}]->(to { id: $toId }) WHERE r.createdAt IS NULL SET r.createdAt = timestamp()`,
      { params: { fromId: input.fromNodeId, toId: input.toNodeId } }
    )

    // 2. Mirror to Neon graph_edges
    try {
      await db
        .insert(graphEdges)
        .values({
          fromNodeId: input.fromNodeId,
          toNodeId: input.toNodeId,
          relationshipType: input.relationshipType,
          description: input.description,
          source: input.source,
          properties: input.properties ?? null,
        })
        .onConflictDoNothing()
    } catch (mirrorErr) {
      console.error(`writeEdge: Neon mirror write failed for edge ${edgeId}:`, mirrorErr)
    }

    return { success: true, id: edgeId }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, id: edgeId, error: message }
  }
}

// ---------------------------------------------------------------------------
// writeBatch
// ---------------------------------------------------------------------------

/**
 * Write arrays of nodes and edges in sequence.
 * Nodes are written first (edges depend on nodes existing).
 * Failures are logged and collected but do not abort the batch.
 */
export async function writeBatch(
  nodes: NodeInput[],
  edges: EdgeInput[]
): Promise<BatchWriteResult> {
  const result: BatchWriteResult = {
    nodesWritten: 0,
    nodesFailed: 0,
    edgesWritten: 0,
    edgesFailed: 0,
    errors: [],
  }

  for (const node of nodes) {
    const r = await writeNode(node)
    if (r.success) {
      result.nodesWritten++
    } else {
      result.nodesFailed++
      result.errors.push(`node ${node.id}: ${r.error}`)
    }
  }

  for (const edge of edges) {
    const r = await writeEdge(edge)
    if (r.success) {
      result.edgesWritten++
    } else {
      result.edgesFailed++
      result.errors.push(`edge ${edge.fromNodeId}→${edge.toNodeId}: ${r.error}`)
    }
  }

  return result
}
