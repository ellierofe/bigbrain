// Node labels — all 14 types from ADR-002
export type NodeLabel =
  | 'Idea'
  | 'Concept'
  | 'CaseStudy'
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

// Relationship types — all types from ADR-002
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
