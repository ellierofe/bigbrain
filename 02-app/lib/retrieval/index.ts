// Unified retrieval layer (RET-01)

// Semantic search
export { findSimilar, findSimilarNodes, searchKnowledge } from './similarity'
export type { EmbeddableTable, SimilarityResult, FindSimilarOptions } from './similarity'

// Structured lookup
export { getDna, getSource, getProcessingRun } from './structured'

// Graph traversal
export { traverseFrom, getNeighbourhood } from './graph-traversal'

// Registry
export { EMBEDDABLE_TABLES, getSearchableTables } from './registry'
export type { EmbeddableTableConfig } from './registry'

// Types
export type {
  RetrievalResult,
  RetrievalFilters,
  GraphTraversalResult,
  TraversalNode,
  TraversalEdge,
  TraversalOptions,
  DnaType,
  SourceType,
} from './types'
