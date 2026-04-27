export type MissionPhase = 'exploring' | 'synthesising' | 'producing' | 'complete' | 'paused'

export interface MissionSummary {
  id: string
  name: string
  thesis: string | null
  phase: MissionPhase
  updatedAt: Date
}

export interface MissionDetail {
  id: string
  brandId: string
  name: string
  thesis: string | null
  phase: MissionPhase
  graphNodeId: string | null
  clientProjectId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface MissionVertical {
  id: string
  name: string
}

export interface MissionLinkedContact {
  id: string
  name: string
  role: string | null
  organisation: string | null
}

export interface MissionLinkedInput {
  id: string
  title: string
  type: string
  documentDate: string | null
  createdAt: Date
}

export interface MissionLinkedStat {
  id: string
  stat: string
  source: string
  sourceYear: number | null
}

export interface CreateMissionInput {
  name: string
  thesis?: string
  verticalIds?: string[]
}

export const PHASE_LABELS: Record<MissionPhase, string> = {
  exploring: 'Exploring',
  synthesising: 'Synthesising',
  producing: 'Producing',
  complete: 'Complete',
  paused: 'Paused',
}

// Phase colours map to the tag-* tokens in globals.css (set DS-02).
// Phases are categories, not states — using tag hues keeps them decorative.
// "complete" is muted to convey "done, no longer active" (rather than "success").
export const PHASE_COLOURS: Record<MissionPhase, string> = {
  exploring: 'bg-tag-4 text-foreground',     // dusty lavender
  synthesising: 'bg-tag-1 text-foreground',  // dusty blue
  producing: 'bg-tag-6 text-foreground',     // olive
  complete: 'bg-muted text-muted-foreground',
  paused: 'bg-tag-3 text-foreground',        // custard
}
