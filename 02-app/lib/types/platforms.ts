import type { Category, Channel } from './channels'

/** @deprecated Replaced by `Category` + `Channel`. Kept for back-compat. */
export type PlatformType = 'social' | 'email' | 'owned_content' | 'video' | 'audio' | 'other'

export type CustomerJourneyStage = 'awareness' | 'engagement' | 'conversion' | 'delight_advocacy'

export interface ContentFormat {
  format: string
  description: string
  characterLimit?: number
  bestFor: string[]
  frequency: string
}

export interface SubtopicIdea {
  subtopic: string
  examples: string[]
}

export interface SignatureFeature {
  name: string
  description: string
}

export interface StructureAndFeatures {
  signatureFeatures: SignatureFeature[]
  contentStructure: string
  brandedComponents: string[]
}

export type CharacterLimits = Record<string, string | number>

export interface Platform {
  id: string
  brandId: string
  name: string
  category: Category
  channel: Channel
  /** @deprecated kept for back-compat — read `category` + `channel` instead */
  platformType: PlatformType | null
  handle: string | null
  isActive: boolean
  primaryObjective: string | null
  audience: string | null
  contentStrategy: string | null
  postingFrequency: string | null
  contentFormats: ContentFormat[]
  characterLimits: CharacterLimits | null
  contentPillarIds: string[] | null
  hashtagStrategy: string | null
  engagementApproach: string | null
  customerJourneyStage: CustomerJourneyStage | null
  growthFunction: string | null
  contentPillarThemes: string | null
  subtopicIdeas: SubtopicIdea[]
  structureAndFeatures: StructureAndFeatures | null
  analyticsGoals: string | null
  performanceSummary: string | null
  doNotDo: string[] | null
  usp: string | null
  notes: string | null
  sourceDocumentIds: string[] | null
  sortOrder: number | null
  createdAt: Date
  updatedAt: Date
}

/** Minimal shape for switcher and card grid */
export interface PlatformSummary {
  id: string
  name: string
  category: Category
  channel: Channel
  primaryObjective: string | null
  isActive: boolean
}

/** Shape submitted by the creation modal */
export interface CreatePlatformInput {
  name: string
  category: Category
  channel: Channel
  handle?: string
  primaryObjective?: string
  audience?: string
}
