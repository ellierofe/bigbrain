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
