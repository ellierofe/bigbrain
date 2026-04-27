export type SegmentStatus = 'draft' | 'active' | 'archived'

export type VocCategory = 'practical' | 'emotional' | 'psychological' | 'social'

export interface VocProblem {
  text: string
  category: VocCategory
}

export interface VocDesire {
  text: string
  category: VocCategory
}

export interface VocObjection {
  objection: string
  answer: string
}

export interface VocBelief {
  text: string
  notes?: string
}

export interface SegmentDemographics {
  ageRange?: string
  sex?: string
  ethnicity?: string
  orientation?: string
  location?: string
  income?: string
  householdIncome?: string
  familySituation?: string
  education?: string
  occupation?: string
  businessIndustry?: string
  businessStage?: string
  businessModel?: string
}

export interface SegmentPsychographics {
  personalityTraits?: string
  motivations?: string
  identity?: string
  valuesAndWorldview?: string
  lifestyle?: string
}

export interface AudienceSegment {
  id: string
  brandId: string
  segmentName: string
  personaName: string | null
  summary: string | null
  demographics: SegmentDemographics | null
  psychographics: SegmentPsychographics | null
  roleContext: string | null
  problems: VocProblem[]
  desires: VocDesire[]
  objections: VocObjection[]
  sharedBeliefs: VocBelief[]
  avatarPrompt: string | null
  avatarUrl: string | null
  status: SegmentStatus
  sortOrder: number | null
  createdAt: Date
  updatedAt: Date
}

/** Minimal shape used in the segment switcher and card grid */
export interface AudienceSegmentSummary {
  id: string
  segmentName: string
  personaName: string | null
  summary: string | null
  avatarUrl: string | null
  status: SegmentStatus
}

export type VocType = 'problems' | 'desires' | 'objections' | 'shared_beliefs'

export type VocItem = VocProblem | VocDesire | VocObjection | VocBelief

/** Shape submitted by the creation modal */
export interface CreateSegmentInput {
  segmentName?: string
  roleContext: string
  biggestProblem: string
  biggestDesire: string
  demographics?: SegmentDemographics
}
