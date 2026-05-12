import { z } from 'zod'
import type { SourceType, Authority, LensId } from './lens'

// Re-export the controlled vocabularies + analysis-lens result types from lens.ts.
// Existing imports of `SourceType` from this module continue to work — but they now
// resolve to the 13-value INP-12 union, not the old 8-value INP-11 union.
export type { SourceType, Authority, LensId, AnalysisLensResult, UnexpectedItem } from './lens'
export {
  SOURCE_TYPES, AUTHORITIES, LENSES, ANALYSIS_LENSES, LENSES_TAKING_INPUT,
  NON_LENSABLE_SOURCE_TYPES, LensNotApplicableError,
  sourceTypeSchema, authoritySchema, lensIdSchema, unexpectedItemSchema,
  patternSpottingResultSchema, selfReflectiveResultSchema, projectSynthesisResultSchema,
  catchUpResultSchema, decisionSupportResultSchema, contentIdeasResultSchema,
  getAnalysisLensSchema,
} from './lens'
export type {
  PatternSpottingResult, SelfReflectiveResult, ProjectSynthesisResult,
  CatchUpResult, DecisionSupportResult, ContentIdeasResult, AnalysisLensResultByLens,
} from './lens'

// ---------------------------------------------------------------------------
// InputMetadata — passed alongside text to extractFromText() / surface-extraction
// ---------------------------------------------------------------------------

export interface InputMetadata {
  title: string
  /** The 13-value source-type controlled vocab. */
  sourceType: SourceType
  /** Evidence weight. Defaults are per-source-type; user can override. */
  authority: Authority
  /** ISO date string (YYYY-MM-DD). Used for temporal graph edges. Falls back to commit date if absent. */
  date?: string
  /** Vercel Blob URL. Null for paste-only inputs. */
  fileRef?: string
  /** Free-form context tags. */
  tags?: string[]
  brandId: string
}

// ---------------------------------------------------------------------------
// Confidence
// ---------------------------------------------------------------------------

export type Confidence = 'high' | 'medium' | 'low'

const confidenceSchema = z.enum(['high', 'medium', 'low'])

// ---------------------------------------------------------------------------
// Surface-extraction item schemas
// Per INP-12 follow-up #1: every item carries sourceRefs[].
// ---------------------------------------------------------------------------

const sourceRefsSchema = z.array(z.string())

export const ideaSchema = z.object({
  id: z.string(),
  text: z.string(),
  confidence: confidenceSchema,
  sourceQuote: z.string().optional(),
  sourceRefs: sourceRefsSchema,
})
export type ExtractedIdea = z.infer<typeof ideaSchema>

export const conceptSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  confidence: confidenceSchema,
  sourceQuote: z.string().optional(),
  sourceRefs: sourceRefsSchema,
})
export type ExtractedConcept = z.infer<typeof conceptSchema>

export const personSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string().optional(),
  organisation: z.string().optional(),
  context: z.string(),
  confidence: confidenceSchema,
  sourceRefs: sourceRefsSchema,
})
export type ExtractedPerson = z.infer<typeof personSchema>

export const organisationSchema = z.object({
  id: z.string(),
  name: z.string(),
  types: z.array(z.string()).optional(),
  context: z.string(),
  confidence: confidenceSchema,
  sourceRefs: sourceRefsSchema,
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
  sourceRefs: sourceRefsSchema,
})
export type ExtractedStory = z.infer<typeof storySchema>

export const techniqueSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  origin: z.string().optional(),
  confidence: confidenceSchema,
  sourceQuote: z.string().optional(),
  sourceRefs: sourceRefsSchema,
})
export type ExtractedTechnique = z.infer<typeof techniqueSchema>

export const contentAngleSchema = z.object({
  id: z.string(),
  angle: z.string(),
  format: z.string().optional(),
  audienceHint: z.string().optional(),
  confidence: confidenceSchema,
  sourceRefs: sourceRefsSchema,
})
export type ExtractedContentAngle = z.infer<typeof contentAngleSchema>

// ---------------------------------------------------------------------------
// Surface-extraction result schema (renamed from extractionResultSchema)
// Carries the universal unexpected[] field for surface-extraction runs.
// ---------------------------------------------------------------------------

export const surfaceExtractionResultSchema = z.object({
  ideas: z.array(ideaSchema),
  concepts: z.array(conceptSchema),
  people: z.array(personSchema),
  organisations: z.array(organisationSchema),
  stories: z.array(storySchema),
  techniques: z.array(techniqueSchema),
  contentAngles: z.array(contentAngleSchema),
  unexpected: z.array(z.object({
    observation: z.string(),
    why: z.string(),
    sourceRefs: sourceRefsSchema,
  })),
})

/** @deprecated alias for backward compatibility during the INP-12 type rename. Will be removed once all callers migrate. */
export const extractionResultSchema = surfaceExtractionResultSchema

export type SurfaceExtractionResult = z.infer<typeof surfaceExtractionResultSchema>
/** @deprecated use SurfaceExtractionResult. */
export type ExtractionOutput = SurfaceExtractionResult

// ExtractionResult wraps the LLM output with the original metadata
export interface ExtractionResult {
  metadata: InputMetadata
  /** The raw text that was processed */
  text: string
  extraction: SurfaceExtractionResult
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
// Minimal source data passed to lens runners
// ---------------------------------------------------------------------------

export interface SourceForProcessing {
  id: string
  title: string
  extractedText: string
  documentDate: string | null
  sourceType: SourceType
  authority: Authority
  tags: string[]
}

// ---------------------------------------------------------------------------
// Deprecated INP-11 type aliases (kept compiling until callers move off)
// ---------------------------------------------------------------------------

/** @deprecated Replaced by `LensId`. INP-11 used `ProcessingMode = 'individual' | 'batch' | 'reflective' | 'synthesis'`.
 *  Map to lens names via legacyModeToLens() in lib/processing/legacy-mode-map.ts. */
export type ProcessingMode = 'individual' | 'batch' | 'reflective' | 'synthesis'

/** @deprecated Use `PatternSpottingResult` from this module. */
export type BatchAnalysis = import('./lens').PatternSpottingResult
/** @deprecated Use `SelfReflectiveResult`. */
export type ReflectiveAnalysis = import('./lens').SelfReflectiveResult
/** @deprecated Use `ProjectSynthesisResult`. */
export type ProjectSynthesis = import('./lens').ProjectSynthesisResult
/** @deprecated Union of the three INP-11 analysis types. Replaced by AnalysisLensResult. */
export type AnalysisResult = BatchAnalysis | ReflectiveAnalysis | ProjectSynthesis

/** @deprecated Zod schema aliases for INP-11 callers. Use `patternSpottingResultSchema` etc. */
export { patternSpottingResultSchema as batchAnalysisSchema } from './lens'
export { selfReflectiveResultSchema as reflectiveAnalysisSchema } from './lens'
export { projectSynthesisResultSchema as projectSynthesisSchema } from './lens'
