export type AssetKind = 'methodology' | 'framework' | 'process' | 'tool' | 'template'
export type AssetStatus = 'draft' | 'active' | 'archived'

export interface VocMapping {
  audienceSegmentId: string
  problems: number[]
  desires: number[]
  objections: number[]
  beliefs: number[]
}

export interface KeyComponent {
  title: string
  description: string
  sortOrder: number
}

export interface FlowStep {
  step: number
  title: string
  description: string
  clientExperience: string
  decisionPoints: string
}

export interface AssetFaq {
  question: string
  answer: string
  type: 'differentiation' | 'logistics' | 'psychological' | 'application'
}

/** Kind-specific detail fields stored in the `detail` JSONB column */
export interface MethodologyDetail {
  deliveryFormat?: string
  duration?: string
  repeatability?: string
  certificationOffered?: boolean
}

export interface FrameworkDetail {
  dimensions?: string[]
  visualMetaphor?: string
  applicationContext?: string
}

export interface ToolDetail {
  format?: string
  fileUrl?: string
  fillTime?: string
  outputFormat?: string
}

export type AssetDetail = MethodologyDetail | FrameworkDetail | ToolDetail

/** Full knowledge asset row from DB */
export interface KnowledgeAsset {
  id: string
  brandId: string
  name: string
  kind: AssetKind
  proprietary: boolean
  status: AssetStatus
  summary: string | null
  principles: string | null
  origin: string | null
  keyComponents: KeyComponent[]
  flow: FlowStep[]
  objectives: string | null
  problemsSolved: string | null
  contexts: string | null
  priorKnowledge: string | null
  resources: string | null
  targetAudienceIds: string[] | null
  relatedOfferIds: string[] | null
  sourceDocumentIds: string[] | null
  graphNodeId: string | null
  detail: AssetDetail | null
  visualPrompt: string | null
  faqs: AssetFaq[]
  vocMapping: VocMapping | null
  createdAt: Date
  updatedAt: Date
}

/** Minimal shape for card grid and switcher */
export interface KnowledgeAssetSummary {
  id: string
  name: string
  kind: AssetKind
  proprietary: boolean
  status: AssetStatus
  summary: string | null
}

/** Input for creating a new asset (Phase 3 metadata) */
export interface CreateAssetInput {
  name: string
  kind: AssetKind
  status?: AssetStatus
  proprietary?: boolean
  targetAudienceIds?: string[]
  sourceDocumentIds?: string[]
  vocMapping?: VocMapping
}

export const ASSET_KIND_LABELS: Record<AssetKind, string> = {
  methodology: 'Methodology',
  framework: 'Framework',
  process: 'Process',
  tool: 'Tool',
  template: 'Template',
}

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  archived: 'Archived',
}
