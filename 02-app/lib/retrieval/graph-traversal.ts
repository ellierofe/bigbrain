import { sql, eq, or, and, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { graphNodes, graphEdges } from '@/lib/db/schema/graph'
import { getGraphClient, GRAPH_NAME } from '@/lib/graph/client'
import type {
  TraversalOptions,
  GraphTraversalResult,
  TraversalNode,
  TraversalEdge,
} from './types'

// ---------------------------------------------------------------------------
// Graph traversal via FalkorDB (with Neon fallback for 1-hop)
// ---------------------------------------------------------------------------

/**
 * Traverse the knowledge graph from a starting node.
 * Uses FalkorDB for multi-hop traversal. Falls back to Neon mirror for 1-hop
 * if FalkorDB is unavailable.
 */
export async function traverseFrom(
  nodeId: string,
  options?: TraversalOptions
): Promise<GraphTraversalResult> {
  const depth = Math.min(Math.max(options?.depth ?? 1, 1), 3)

  try {
    return await traverseFalkorDB(nodeId, depth, options)
  } catch (err) {
    console.warn('FalkorDB traversal failed, falling back to Neon mirror:', err)

    if (depth > 1) {
      throw new Error(
        `Graph traversal at depth ${depth} requires FalkorDB, which is currently unavailable. ` +
        `Try depth=1 for a Neon mirror fallback, or use search_knowledge instead.`
      )
    }

    return traverseNeonFallback(nodeId, options)
  }
}

/**
 * Convenience wrapper: get immediate 1-hop neighbourhood of a node.
 */
export async function getNeighbourhood(nodeId: string): Promise<GraphTraversalResult> {
  return traverseFrom(nodeId, { depth: 1 })
}

// ---------------------------------------------------------------------------
// FalkorDB traversal
// ---------------------------------------------------------------------------

async function traverseFalkorDB(
  nodeId: string,
  depth: number,
  options?: TraversalOptions
): Promise<GraphTraversalResult> {
  const client = await getGraphClient()
  const graph = client.selectGraph(GRAPH_NAME)

  // Build Cypher query
  // Variable-length relationship pattern: -[r*1..N]-
  const relFilter = options?.relationshipTypes?.length
    ? `:${options.relationshipTypes.join('|')}`
    : ''
  const depthPattern = `[r${relFilter}*1..${depth}]`

  // Fetch the start node
  const startResult = await graph.query(
    `MATCH (n {id: $id}) RETURN n.id AS id, labels(n)[0] AS label, n.name AS name, n.description AS description, n.source AS source, n.properties AS properties`,
    { params: { id: nodeId } }
  )

  if (!startResult.data || startResult.data.length === 0) {
    throw new Error(`Node ${nodeId} not found in FalkorDB`)
  }

  const startRow = startResult.data[0] as any
  const startNode: TraversalNode = {
    id: startRow.id,
    label: startRow.label ?? 'Unknown',
    name: startRow.name ?? '',
    description: startRow.description ?? null,
    source: startRow.source ?? null,
    properties: startRow.properties ? safeParseJson(startRow.properties) : null,
  }

  // Fetch connected nodes and edges
  const traversalQuery = `
    MATCH (start {id: $id})-${depthPattern}-(connected)
    RETURN DISTINCT
      connected.id AS id,
      labels(connected)[0] AS label,
      connected.name AS name,
      connected.description AS description,
      connected.source AS source,
      connected.properties AS properties
  `
  const nodesResult = await graph.query(traversalQuery, { params: { id: nodeId } })

  let nodes: TraversalNode[] = ((nodesResult.data ?? []) as any[]).map((row) => ({
    id: row.id,
    label: row.label ?? 'Unknown',
    name: row.name ?? '',
    description: row.description ?? null,
    source: row.source ?? null,
    properties: row.properties ? safeParseJson(row.properties) : null,
  }))

  // Apply node label filter if provided
  if (options?.nodeLabels?.length) {
    const allowed = new Set(options.nodeLabels)
    nodes = nodes.filter((n) => allowed.has(n.label))
  }

  // Fetch edges between start and connected nodes
  const connectedIds = nodes.map((n) => n.id)
  let edges: TraversalEdge[] = []

  if (connectedIds.length > 0) {
    const edgesQuery = `
      MATCH (a)-[r]->(b)
      WHERE a.id = $id OR b.id = $id
      RETURN
        a.id AS fromId,
        b.id AS toId,
        type(r) AS relType,
        r.description AS description,
        r.source AS source
    `
    const edgesResult = await graph.query(edgesQuery, { params: { id: nodeId } })

    edges = ((edgesResult.data ?? []) as any[]).map((row) => ({
      fromNodeId: row.fromId,
      toNodeId: row.toId,
      relationshipType: row.relType,
      description: row.description ?? null,
      source: row.source ?? null,
    }))
  }

  return { startNode, nodes, edges }
}

// ---------------------------------------------------------------------------
// Neon mirror fallback (1-hop only)
// ---------------------------------------------------------------------------

async function traverseNeonFallback(
  nodeId: string,
  options?: TraversalOptions
): Promise<GraphTraversalResult> {
  // Get the start node
  const [startRow] = await db
    .select()
    .from(graphNodes)
    .where(eq(graphNodes.id, nodeId))
    .limit(1)

  if (!startRow) {
    throw new Error(`Node ${nodeId} not found in Neon mirror`)
  }

  const startNode: TraversalNode = {
    id: startRow.id,
    label: startRow.label,
    name: startRow.name,
    description: startRow.description,
    source: startRow.source,
    properties: startRow.properties as Record<string, unknown> | null,
  }

  // Get all edges touching this node
  const edgeConditions = [
    or(
      eq(graphEdges.fromNodeId, nodeId),
      eq(graphEdges.toNodeId, nodeId)
    )!,
  ]

  if (options?.relationshipTypes?.length) {
    edgeConditions.push(
      inArray(graphEdges.relationshipType, options.relationshipTypes)
    )
  }

  const edgeRows = await db
    .select()
    .from(graphEdges)
    .where(and(...edgeConditions))

  const edges: TraversalEdge[] = edgeRows.map((e) => ({
    fromNodeId: e.fromNodeId,
    toNodeId: e.toNodeId,
    relationshipType: e.relationshipType,
    description: e.description,
    source: e.source,
  }))

  // Collect connected node IDs
  const connectedIds = new Set<string>()
  for (const e of edgeRows) {
    if (e.fromNodeId !== nodeId) connectedIds.add(e.fromNodeId)
    if (e.toNodeId !== nodeId) connectedIds.add(e.toNodeId)
  }

  if (connectedIds.size === 0) {
    return { startNode, nodes: [], edges: [] }
  }

  // Fetch connected nodes
  let nodeRows = await db
    .select()
    .from(graphNodes)
    .where(inArray(graphNodes.id, Array.from(connectedIds)))

  // Apply label filter
  if (options?.nodeLabels?.length) {
    const allowed = new Set(options.nodeLabels)
    nodeRows = nodeRows.filter((n) => allowed.has(n.label))
  }

  const nodes: TraversalNode[] = nodeRows.map((n) => ({
    id: n.id,
    label: n.label,
    name: n.name,
    description: n.description,
    source: n.source,
    properties: n.properties as Record<string, unknown> | null,
  }))

  return { startNode, nodes, edges }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeParseJson(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'object' && value !== null) return value as Record<string, unknown>
  if (typeof value === 'string') {
    try { return JSON.parse(value) } catch { return null }
  }
  return null
}
