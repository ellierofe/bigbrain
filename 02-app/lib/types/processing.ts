import { z } from 'zod'

// ---------------------------------------------------------------------------
// InputMetadata — passed alongside text to extractFromText()
// ---------------------------------------------------------------------------

export type SourceType =
  | 'transcript'
  | 'session-note'
  | 'research'
  | 'voice-note'
  | 'image'
  | 'email'
  | 'document'
  | 'other'

export interface InputMetadata {
  title: string
  sourceType: SourceType
  /** ISO date string (YYYY-MM-DD). Used for temporal graph edges. Falls back to commit date if absent. */
  date?: string
  /** Vercel Blob URL. Null for paste-only inputs. */
  fileRef?: string
  /** Free-form context tags, e.g. ["coaching", "client:acme"]. */
  tags?: string[]
  brandId: string
}

// ---------------------------------------------------------------------------
// Confidence
// ---------------------------------------------------------------------------

export type Confidence = 'high' | 'medium' | 'low'

const confidenceSchema = z.enum(['high', 'medium', 'low'])

// ---------------------------------------------------------------------------
// Extracted item types — Zod schemas + TypeScript types
// ---------------------------------------------------------------------------

export const ideaSchema = z.object({
  id: z.string(),
  text: z.string(),
  confidence: confidenceSchema,
  sourceQuote: z.string().optional(),
})
export type ExtractedIdea = z.infer<typeof ideaSchema>

export const conceptSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  confidence: confidenceSchema,
  sourceQuote: z.string().optional(),
})
export type ExtractedConcept = z.infer<typeof conceptSchema>

export const personSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string().optional(),
  organisation: z.string().optional(),
  context: z.string(),
  confidence: confidenceSchema,
})
export type ExtractedPerson = z.infer<typeof personSchema>

export const organisationSchema = z.object({
  id: z.string(),
  name: z.string(),
  types: z.array(z.string()).optional(),
  context: z.string(),
  confidence: confidenceSchema,
})
export type ExtractedOrganisation = z.infer<typeof organisationSchema>

export const storySchema = z.object({
  id: z.string(),
  title: z.string(),
  narrative: z.string(),
  hook: z.string().optional(),
  lesson: z.string().optional(),
  type: z.string(),
  confidence: confidenceSchema,
})
export type ExtractedStory = z.infer<typeof storySchema>

export const techniqueSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  origin: z.string().optional(),
  confidence: confidenceSchema,
  sourceQuote: z.string().optional(),
})
export type ExtractedTechnique = z.infer<typeof techniqueSchema>

export const contentAngleSchema = z.object({
  id: z.string(),
  angle: z.string(),
  format: z.string().optional(),
  audienceHint: z.string().optional(),
  confidence: confidenceSchema,
})
export type ExtractedContentAngle = z.infer<typeof contentAngleSchema>

// ---------------------------------------------------------------------------
// ExtractionResultSchema — the full structured output from the LLM
// ---------------------------------------------------------------------------

export const extractionResultSchema = z.object({
  ideas: z.array(ideaSchema),
  concepts: z.array(conceptSchema),
  people: z.array(personSchema),
  organisations: z.array(organisationSchema),
  stories: z.array(storySchema),
  techniques: z.array(techniqueSchema),
  contentAngles: z.array(contentAngleSchema),
})

export type ExtractionOutput = z.infer<typeof extractionResultSchema>

// ExtractionResult wraps the LLM output with the original metadata
export interface ExtractionResult {
  metadata: InputMetadata
  /** The raw text that was processed */
  text: string
  extraction: ExtractionOutput
  /** Topic clusters grouping items by overarching theme. Generated post-extraction. */
  topicClusters?: Array<{
    topic: string
    items: Array<{ id: string; category: string }>
  }>
}

// ---------------------------------------------------------------------------
// CommitResult — returned by commitExtraction()
// ---------------------------------------------------------------------------

export interface CommitCounts {
  sourceDocument: number
  ideas: number
  concepts: number
  people: number
  organisations: number
  stories: number
  techniques: number
  contentAngles: number
  edges: number
  embeddings: number
}

export interface CommitResult {
  success: boolean
  counts: CommitCounts
  errors: string[]
}

// ---------------------------------------------------------------------------
// StorySubject — editable in UI before commit
// ---------------------------------------------------------------------------

export type StorySubject = 'self' | 'client' | 'peer' | 'business' | 'project'

// Augmented story type that includes the editable subject field
export interface StoryWithSubject extends ExtractedStory {
  subject: StorySubject
}

// ---------------------------------------------------------------------------
// Processing modes (INP-11)
// ---------------------------------------------------------------------------

export type ProcessingMode = 'individual' | 'batch' | 'reflective' | 'synthesis'

/** Minimal source data passed to analysis functions */
export interface SourceForProcessing {
  id: string
  title: string
  extractedText: string
  documentDate: string | null
  type: string
  tags: string[]
}

// ---------------------------------------------------------------------------
// Batch Analysis schema (INP-11 Mode 2)
// ---------------------------------------------------------------------------

export const batchAnalysisSchema = z.object({
  summary: z.string(),
  sourceCount: z.number(),
  dateRange: z.object({ from: z.string(), to: z.string() }),
  recurringThemes: z.array(z.object({
    theme: z.string(),
    description: z.string(),
    sourceRefs: z.array(z.string()),
  })),
  convergences: z.array(z.object({
    point: z.string(),
    description: z.string(),
    sourceRefs: z.array(z.string()),
  })),
  divergences: z.array(z.object({
    point: z.string(),
    description: z.string(),
    sourceRefs: z.array(z.string()),
  })),
  synthesisedInsights: z.array(z.object({
    insight: z.string(),
    basis: z.string(),
    implication: z.string(),
    sourceRefs: z.array(z.string()),
  })),
  gaps: z.array(z.object({
    gap: z.string(),
    description: z.string(),
  })),
})

export type BatchAnalysis = z.infer<typeof batchAnalysisSchema>

// ---------------------------------------------------------------------------
// Reflective Analysis schema (INP-11 Mode 3)
// ---------------------------------------------------------------------------

export const reflectiveAnalysisSchema = z.object({
  summary: z.string(),
  period: z.object({ from: z.string(), to: z.string() }),
  sessionCount: z.number(),
  commitmentsAndFollowthrough: z.array(z.object({
    commitment: z.string(),
    status: z.enum(['completed', 'in_progress', 'dropped', 'recurring']),
    sessions: z.array(z.string()),
    notes: z.string(),
  })),
  recurringBlockers: z.array(z.object({
    blocker: z.string(),
    frequency: z.number(),
    resolved: z.boolean(),
    resolution: z.string().optional(),
  })),
  emergingThemes: z.array(z.object({
    theme: z.string(),
    trajectory: z.string(),
    sessions: z.array(z.string()),
  })),
  shiftsInThinking: z.array(z.object({
    shift: z.string(),
    from: z.string(),
    to: z.string(),
    trigger: z.string().optional(),
  })),
  energyAndMomentum: z.object({
    highPoints: z.array(z.string()),
    lowPoints: z.array(z.string()),
    patterns: z.string(),
  }),
  keyRealisations: z.array(z.object({
    realisation: z.string(),
    session: z.string(),
    significance: z.string(),
  })),
  metaAnalysis: z.array(z.object({
    observation: z.string(),
    evidence: z.string(),
    suggestions: z.string(),
  })),
})

export type ReflectiveAnalysis = z.infer<typeof reflectiveAnalysisSchema>

// ---------------------------------------------------------------------------
// Project Synthesis schema (INP-11 Mode 4)
// ---------------------------------------------------------------------------

export const projectSynthesisSchema = z.object({
  summary: z.string(),
  projectName: z.string(),
  sourceCount: z.number(),
  dateRange: z.object({ from: z.string(), to: z.string() }),
  methodology: z.object({
    overview: z.string(),
    steps: z.array(z.object({
      step: z.string(),
      description: z.string(),
      tools: z.array(z.string()).optional(),
    })),
  }),
  whatWorked: z.array(z.object({
    approach: z.string(),
    evidence: z.string(),
    sourceRefs: z.array(z.string()),
  })),
  whatDidntWork: z.array(z.object({
    approach: z.string(),
    whatHappened: z.string(),
    lesson: z.string(),
  })),
  reusablePatterns: z.array(z.object({
    pattern: z.string(),
    description: z.string(),
    applicability: z.string(),
  })),
  caseStudyNarrative: z.string(),
  contentAngles: z.array(z.object({
    angle: z.string(),
    audience: z.string(),
    whyItResonates: z.string(),
  })),
  openThreads: z.array(z.object({
    question: z.string(),
    context: z.string(),
  })),
})

export type ProjectSynthesis = z.infer<typeof projectSynthesisSchema>

/** Union of all analysis result types */
export type AnalysisResult = BatchAnalysis | ReflectiveAnalysis | ProjectSynthesis
