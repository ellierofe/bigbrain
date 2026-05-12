// Node labels — base 14 from ADR-002 plus 4 added in ADR-002a (INP-12)
export type NodeLabel =
  | 'Idea'
  | 'Concept'
  | 'Mission'
  | 'Vertical'
  | 'Methodology'
  | 'Person'
  | 'Organisation'
  | 'Event'
  | 'SourceDocument'
  | 'ContentItem'
  | 'Project'
  | 'FundingEvent'
  | 'Policy'
  | 'Country'
  | 'Date'
  // ADR-002a additions (INP-12)
  | 'SourceChunk'         // child of SourceDocument; per-passage retrieval grain
  | 'SourceCollection'    // container for many sibling SourceItem children (datasets, scrapes)
  | 'SourceItem'          // individual member of a SourceCollection
  | 'LensReport'          // durable analysis-lens artefact

// Relationship types — base from ADR-002 plus 2 added in ADR-002a (INP-12).
// PART_OF already existed in ADR-002 and is reused for SourceChunk → SourceDocument
// and SourceItem → SourceCollection per ADR-002a §2.
export type RelationshipType =
  // Provenance and source
  | 'DERIVED_FROM'
  | 'PART_OF'
  | 'INFORMED_BY'
  | 'PRODUCED_BY'
  // Thematic grouping
  | 'BELONGS_TO'
  | 'OVERLAPS_WITH'
  | 'SUPPORTS'
  | 'CONTRADICTS'
  | 'RELATES_TO'
  // Temporal
  | 'ON_DATE'
  | 'IN_MONTH'
  | 'IN_YEAR'
  // Actor relationships
  | 'MENTIONS'
  | 'INTERVIEWED_IN'
  | 'EMPLOYS'
  | 'ADVISES'
  | 'FUNDS'
  | 'RAISED'
  // Geographic
  | 'LOCATED_IN'
  | 'CONCERNS'
  // Project scoping
  | 'SCOPED_TO'
  | 'GENERATED'
  | 'COMMISSIONED_BY'
  // ADR-002a additions (INP-12)
  | 'IDENTIFIED_IN'       // Idea/Concept/Methodology/Person/Organisation → LensReport
  | 'ANALYSED_FROM'       // LensReport → SourceDocument/SourceCollection

// Actor node types that go through canonical register resolution
export const CANONICAL_TYPES = new Set<NodeLabel>(['Person', 'Organisation', 'Project'])

export interface NodeInput {
  id: string                               // caller-generated uuid
  label: NodeLabel
  name: string                             // canonical name
  description: string                      // required — describe only what the source supports
  source: string                           // e.g. 'AL_TRANSCRIPT', 'MANUAL', 'SEED_ISO3166'
  fileRef?: string
  properties?: Record<string, unknown>     // label-specific fields per ADR-002 §3
}

export interface EdgeInput {
  fromNodeId: string
  toNodeId: string
  relationshipType: RelationshipType
  description: string                      // required — describe this specific relationship
  source: string
  properties?: Record<string, unknown>
}

export interface WriteResult {
  success: boolean
  id: string                               // node id or edge fromNodeId→toNodeId
  error?: string
}

export interface BatchWriteResult {
  nodesWritten: number
  nodesFailed: number
  edgesWritten: number
  edgesFailed: number
  errors: string[]
}
