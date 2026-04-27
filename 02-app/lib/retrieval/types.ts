// Shared types for the unified retrieval layer (RET-01)

/** Every retrieval result carries this shape — regardless of source */
export interface RetrievalResult {
  id: string
  type:
    | 'graph_node'
    | 'dna'
    | 'source_document'
    | 'statistic'
    | 'testimonial'
    | 'story'
    | 'research'
    | 'analysis'
    | 'processing_run'
  /** e.g. node label ('Idea', 'Person'), DNA type ('audience_segments'), source type ('transcript') */
  subtype?: string
  name: string
  date?: string
  /** Similarity score 0-1 for semantic search results. Absent for explicit lookups. */
  score?: number
  /** Why this result was included: 'semantic match', 'graph neighbour of X', 'explicitly requested' */
  reason: string
  /** Text excerpt used for context */
  snippet?: string
  /** Internal link to view this item in the dashboard */
  url?: string
}

export interface RetrievalFilters {
  /** Filter to specific result types (e.g. ['graph_node', 'testimonial']) */
  types?: RetrievalResult['type'][]
  /** Date range filter */
  dateRange?: { from?: string; to?: string }
  /** Tag filter (any match) */
  tags?: string[]
  /** Max results. Default 10, max 50. */
  limit?: number
}

// ---------------------------------------------------------------------------
// Graph traversal result types
// ---------------------------------------------------------------------------

export interface TraversalNode {
  id: string
  label: string
  name: string
  description: string | null
  source: string | null
  properties: Record<string, unknown> | null
}

export interface TraversalEdge {
  fromNodeId: string
  toNodeId: string
  relationshipType: string
  description: string | null
  source: string | null
}

export interface GraphTraversalResult {
  startNode: TraversalNode
  nodes: TraversalNode[]
  edges: TraversalEdge[]
}

export interface TraversalOptions {
  /** Traversal depth. Default 1, max 3. */
  depth?: number
  /** Filter to specific relationship types */
  relationshipTypes?: string[]
  /** Filter to specific node labels */
  nodeLabels?: string[]
}

// ---------------------------------------------------------------------------
// DNA and source type enums (used by LLM tools and structured lookup)
// ---------------------------------------------------------------------------

export type DnaType =
  | 'business_overview'
  | 'brand_meaning'
  | 'value_proposition'
  | 'brand_identity'
  | 'audience_segments'
  | 'offers'
  | 'knowledge_assets'
  | 'platforms'
  | 'competitors'
  | 'tone_of_voice'

export type SourceType =
  | 'documents'
  | 'statistics'
  | 'testimonials'
  | 'stories'
  | 'research'
  | 'analysis'
