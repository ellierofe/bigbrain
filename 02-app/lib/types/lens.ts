import { z } from 'zod'

// ---------------------------------------------------------------------------
// Source × Lens controlled vocabularies (INP-12 / ADR-009)
// ---------------------------------------------------------------------------

export const SOURCE_TYPES = [
  'client-interview',
  'coaching-call',
  'peer-conversation',
  'supplier-conversation',
  'accountability-checkin',
  'meeting-notes',
  'internal-notes',
  'research-document',
  'dataset',
  'pitch-deck',
  'report',
  'collection',
  'content-idea',
] as const
export type SourceType = (typeof SOURCE_TYPES)[number]
export const sourceTypeSchema = z.enum(SOURCE_TYPES)

export const AUTHORITIES = ['own', 'peer', 'external-authoritative', 'external-sample'] as const
export type Authority = (typeof AUTHORITIES)[number]
export const authoritySchema = z.enum(AUTHORITIES)

export const LENSES = [
  'surface-extraction',
  'self-reflective',
  'project-synthesis',
  'pattern-spotting',
  'catch-up',
  'decision-support',
  'content-ideas',
] as const
export type LensId = (typeof LENSES)[number]
export const lensIdSchema = z.enum(LENSES)

/** Lenses that produce a durable LensReport row + graph node. Surface-extraction is the only exception. */
export const ANALYSIS_LENSES: LensId[] = [
  'self-reflective',
  'project-synthesis',
  'pattern-spotting',
  'catch-up',
  'decision-support',
  'content-ideas',
]

/** Lenses that take user-supplied input alongside the corpus. */
export const LENSES_TAKING_INPUT: LensId[] = ['decision-support', 'catch-up']

/** Source types that bypass the lens path entirely (per ADR-009 amendment). */
export const NON_LENSABLE_SOURCE_TYPES: SourceType[] = ['dataset']

/** Thrown when the prompt composer is asked to compose a lens prompt for a source type
 *  that bypasses the lens path (currently: 'dataset'). Per ADR-009: fail loud, not silent. */
export class LensNotApplicableError extends Error {
  readonly sourceType: SourceType
  readonly lens: LensId
  constructor(sourceType: SourceType, lens: LensId) {
    super(`Lens '${lens}' is not applicable to source type '${sourceType}'.`)
    this.name = 'LensNotApplicableError'
    this.sourceType = sourceType
    this.lens = lens
  }
}

// ---------------------------------------------------------------------------
// Universal unexpected[] field (per extraction-schemas/_base.md)
// ---------------------------------------------------------------------------

export const unexpectedItemSchema = z.object({
  observation: z.string(),
  why: z.string(),
  sourceRefs: z.array(z.string()),
})
export type UnexpectedItem = z.infer<typeof unexpectedItemSchema>

const unexpectedFieldSchema = z.array(unexpectedItemSchema)

// ---------------------------------------------------------------------------
// Shared analysis-lens primitives
// ---------------------------------------------------------------------------

const dateRangeSchema = z.object({ from: z.string(), to: z.string() })
const sourceRefsSchema = z.array(z.string())

// ---------------------------------------------------------------------------
// Pattern-spotting result (was BatchAnalysis)
// ---------------------------------------------------------------------------

export const patternSpottingResultSchema = z.object({
  summary: z.string(),
  dateRange: dateRangeSchema,
  sourceCount: z.number(),
  recurringThemes: z.array(z.object({
    theme: z.string(),
    description: z.string(),
    sourceRefs: sourceRefsSchema,
  })),
  convergences: z.array(z.object({
    point: z.string(),
    description: z.string(),
    sourceRefs: sourceRefsSchema,
  })),
  divergences: z.array(z.object({
    point: z.string(),
    description: z.string(),
    sourceRefs: sourceRefsSchema,
  })),
  synthesisedInsights: z.array(z.object({
    insight: z.string(),
    basis: z.string(),
    implication: z.string(),
    sourceRefs: sourceRefsSchema,
  })),
  gaps: z.array(z.object({
    gap: z.string(),
    description: z.string(),
  })),
  unexpected: unexpectedFieldSchema,
})
export type PatternSpottingResult = z.infer<typeof patternSpottingResultSchema>

// ---------------------------------------------------------------------------
// Self-reflective result (was ReflectiveAnalysis)
// ---------------------------------------------------------------------------

export const selfReflectiveResultSchema = z.object({
  summary: z.string(),
  period: dateRangeSchema,
  sessionCount: z.number(),
  commitmentsAndFollowthrough: z.array(z.object({
    commitment: z.string(),
    status: z.enum(['completed', 'in_progress', 'dropped', 'recurring']),
    notes: z.string(),
    sourceRefs: sourceRefsSchema,
  })),
  recurringBlockers: z.array(z.object({
    blocker: z.string(),
    frequency: z.number(),
    resolved: z.boolean(),
    resolution: z.string().optional(),
    sourceRefs: sourceRefsSchema,
  })),
  emergingThemes: z.array(z.object({
    theme: z.string(),
    trajectory: z.enum(['growing', 'stable', 'fading']),
    description: z.string(),
    sourceRefs: sourceRefsSchema,
  })),
  shiftsInThinking: z.array(z.object({
    shift: z.string(),
    from: z.string(),
    to: z.string(),
    trigger: z.string().optional(),
    sourceRefs: sourceRefsSchema,
  })),
  energyAndMomentum: z.object({
    highPoints: z.array(z.string()),
    lowPoints: z.array(z.string()),
    patterns: z.string(),
    sourceRefs: sourceRefsSchema,
  }),
  keyRealisations: z.array(z.object({
    realisation: z.string(),
    significance: z.string(),
    sourceRefs: sourceRefsSchema,
  })),
  metaAnalysis: z.array(z.object({
    observation: z.string(),
    evidence: z.string(),
    suggestions: z.string(),
    sourceRefs: sourceRefsSchema,
  })),
  unexpected: unexpectedFieldSchema,
})
export type SelfReflectiveResult = z.infer<typeof selfReflectiveResultSchema>

// ---------------------------------------------------------------------------
// Project-synthesis result (was ProjectSynthesis)
// ---------------------------------------------------------------------------

export const projectSynthesisResultSchema = z.object({
  summary: z.string(),
  projectName: z.string(),
  sourceCount: z.number(),
  dateRange: dateRangeSchema,
  methodology: z.object({
    overview: z.string(),
    steps: z.array(z.object({
      step: z.string(),
      description: z.string(),
      tools: z.array(z.string()).optional(),
      sourceRefs: sourceRefsSchema,
    })),
  }),
  whatWorked: z.array(z.object({
    approach: z.string(),
    evidence: z.string(),
    sourceRefs: sourceRefsSchema,
  })),
  whatDidntWork: z.array(z.object({
    approach: z.string(),
    whatHappened: z.string(),
    lesson: z.string(),
    sourceRefs: sourceRefsSchema,
  })),
  reusablePatterns: z.array(z.object({
    pattern: z.string(),
    description: z.string(),
    applicability: z.string(),
    sourceRefs: sourceRefsSchema,
  })),
  caseStudyNarrative: z.string(),
  contentAngles: z.array(z.object({
    angle: z.string(),
    audience: z.string(),
    whyItResonates: z.string(),
    sourceRefs: sourceRefsSchema,
  })),
  openThreads: z.array(z.object({
    question: z.string(),
    context: z.string(),
    sourceRefs: sourceRefsSchema,
  })),
  unexpected: unexpectedFieldSchema,
})
export type ProjectSynthesisResult = z.infer<typeof projectSynthesisResultSchema>

// ---------------------------------------------------------------------------
// Catch-up result (new in INP-12)
// ---------------------------------------------------------------------------

export const catchUpResultSchema = z.object({
  summary: z.string(),
  since: z.string(),
  whatChanged: z.array(z.object({
    topic: z.string(),
    priorState: z.string(),
    currentState: z.string(),
    trigger: z.string(),
    sourceRefs: sourceRefsSchema,
  })),
  newDevelopments: z.array(z.object({
    development: z.string(),
    significance: z.string(),
    sourceRefs: sourceRefsSchema,
  })),
  whoSaidWhat: z.array(z.object({
    person: z.string(),
    contribution: z.string(),
    sourceRefs: sourceRefsSchema,
  })),
  unresolvedFromLastTime: z.array(z.object({
    item: z.string(),
    baselineContext: z.string(),
    sourceRefs: sourceRefsSchema,
  })),
  unexpected: unexpectedFieldSchema,
})
export type CatchUpResult = z.infer<typeof catchUpResultSchema>

// ---------------------------------------------------------------------------
// Decision-support result (new in INP-12)
// ---------------------------------------------------------------------------

export const decisionSupportResultSchema = z.object({
  summary: z.string(),
  decisionText: z.string(),
  decisionFraming: z.object({
    type: z.enum(['binary', 'multi-option', 'open']),
    options: z.array(z.string()).optional(),
    statedQuestion: z.string(),
    impliedQuestion: z.string().optional(),
  }),
  evidenceFor: z.array(z.object({
    evidence: z.string(),
    option: z.string().optional(),
    strength: z.enum(['strong', 'moderate', 'weak']),
    sourceRefs: sourceRefsSchema,
  })),
  evidenceAgainst: z.array(z.object({
    evidence: z.string(),
    option: z.string().optional(),
    strength: z.enum(['strong', 'moderate', 'weak']),
    sourceRefs: sourceRefsSchema,
  })),
  gaps: z.array(z.object({
    gap: z.string(),
    whyItMatters: z.string(),
    fillSuggestion: z.string(),
  })),
  suggestedNextSteps: z.array(z.object({
    step: z.string(),
    rationale: z.string(),
    sourceRefs: sourceRefsSchema.optional(),
  })),
  unexpected: unexpectedFieldSchema,
})
export type DecisionSupportResult = z.infer<typeof decisionSupportResultSchema>

// ---------------------------------------------------------------------------
// Content-ideas result (new in INP-12)
// ---------------------------------------------------------------------------

export const contentIdeasResultSchema = z.object({
  summary: z.string(),
  hooks: z.array(z.object({
    hook: z.string(),
    pieceType: z.string(),
    thesisToBackUp: z.string(),
    sourceRefs: sourceRefsSchema,
  })),
  angles: z.array(z.object({
    angle: z.string(),
    audience: z.string(),
    whyItResonates: z.string(),
    corpusSubstance: z.string(),
    crossSource: z.boolean(),
    sourceRefs: sourceRefsSchema,
  })),
  formats: z.array(z.object({
    format: z.string(),
    suitedTo: z.array(z.string()),
    rationale: z.string(),
  })),
  audienceHypotheses: z.array(z.object({
    audience: z.string(),
    corpusSignals: z.string(),
    sampleAngles: z.array(z.string()),
    sourceRefs: sourceRefsSchema,
  })),
  unexpected: unexpectedFieldSchema,
})
export type ContentIdeasResult = z.infer<typeof contentIdeasResultSchema>

// ---------------------------------------------------------------------------
// Lens result discriminated union (analysis lenses only — surface-extraction
// has its own shape in processing.ts because it's per-item, not per-section)
// ---------------------------------------------------------------------------

export type AnalysisLensResult =
  | PatternSpottingResult
  | SelfReflectiveResult
  | ProjectSynthesisResult
  | CatchUpResult
  | DecisionSupportResult
  | ContentIdeasResult

export interface AnalysisLensResultByLens {
  'pattern-spotting': PatternSpottingResult
  'self-reflective': SelfReflectiveResult
  'project-synthesis': ProjectSynthesisResult
  'catch-up': CatchUpResult
  'decision-support': DecisionSupportResult
  'content-ideas': ContentIdeasResult
}

export function getAnalysisLensSchema(lens: Exclude<LensId, 'surface-extraction'>) {
  switch (lens) {
    case 'pattern-spotting': return patternSpottingResultSchema
    case 'self-reflective': return selfReflectiveResultSchema
    case 'project-synthesis': return projectSynthesisResultSchema
    case 'catch-up': return catchUpResultSchema
    case 'decision-support': return decisionSupportResultSchema
    case 'content-ideas': return contentIdeasResultSchema
  }
}
