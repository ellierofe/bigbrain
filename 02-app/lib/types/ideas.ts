export type IdeaType = 'idea' | 'question'
export type IdeaStatus = 'captured' | 'shelved' | 'done'
export type IdeaSource = 'manual' | 'ai_surfaced'

export interface Idea {
  id: string
  brandId: string
  text: string
  type: IdeaType
  status: IdeaStatus
  source: IdeaSource
  contextPage: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateIdeaInput {
  text: string
  type: IdeaType
  contextPage: string | null
}

export interface IdeaCounts {
  all: number
  captured: number
  shelved: number
  done: number
  ideas: number
  questions: number
}

/** Entity types that ideas can be tagged to */
export type IdeaTagEntityType =
  | 'mission'
  | 'client_project'
  | 'offer'
  | 'knowledge_asset'
  | 'audience_segment'

export interface IdeaTag {
  id: string
  ideaId: string
  entityType: IdeaTagEntityType
  entityId: string
  entityName: string | null // resolved at query time, not stored
  createdAt: Date
}

export interface IdeaWithTags extends Idea {
  tags: IdeaTag[]
}
