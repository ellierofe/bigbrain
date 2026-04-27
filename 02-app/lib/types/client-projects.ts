export type ProjectStatus = 'active' | 'paused' | 'complete' | 'archived'

export interface ClientProjectSummary {
  id: string
  name: string
  status: ProjectStatus
  organisationName: string
  updatedAt: Date
}

export interface ClientProjectDetail {
  id: string
  brandId: string
  name: string
  organisationId: string
  organisationName: string
  brief: string | null
  status: ProjectStatus
  graphNodeId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateProjectInput {
  name: string
  organisationId: string
  brief?: string
}

export interface OrganisationSummary {
  id: string
  name: string
  website: string | null
}

export interface LinkedMission {
  id: string
  name: string
  phase: string
  updatedAt: Date
}

export interface LinkedInput {
  id: string
  sourceDocumentId: string
  title: string
  type: string
  createdAt: Date
}

export interface LinkedStat {
  id: string
  statId: string
  claim: string
  source: string | null
  statDate: string | null
}

export interface LinkedIdea {
  id: string
  text: string
  type: string
  status: string
  createdAt: Date
}
