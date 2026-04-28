import { MODELS, generateObjectWithFallback } from '@/lib/llm/client'
import {
  SEGMENT_GENERATION_SYSTEM_PROMPT,
  SEGMENT_EVALUATION_SYSTEM_PROMPT,
  buildSegmentGenerationUserMessage,
  buildSegmentEvaluationUserMessage,
  type SegmentPromptInput,
  type SegmentPromptContext,
} from '@/lib/llm/prompts/audience-segment'
import {
  segmentGenerationSchema,
  segmentEvaluationSchema,
  type SegmentGenerationOutput,
  type SegmentEvaluationResult,
} from '@/lib/types/generation'
import { getBusinessOverview, getValueProposition } from '@/lib/db/queries/dna-singular'
import { listSegments } from '@/lib/db/queries/audience-segments'

// ---------------------------------------------------------------------------
// Load business context for prompt injection
// ---------------------------------------------------------------------------

async function loadBusinessContext(brandId: string): Promise<SegmentPromptContext> {
  const [business, valueProp, segments] = await Promise.all([
    getBusinessOverview(brandId),
    getValueProposition(brandId),
    listSegments(brandId),
  ])

  return {
    business: business
      ? {
          businessName: business.businessName ?? undefined,
          vertical: business.vertical ?? undefined,
          specialism: business.specialism ?? undefined,
          businessModel: business.businessModel ?? undefined,
          shortDescription: business.shortDescription ?? undefined,
          fullDescription: business.fullDescription ?? undefined,
        }
      : null,
    valueProp: valueProp
      ? {
          coreStatement: valueProp.coreStatement ?? undefined,
          problemSolved: valueProp.problemSolved ?? undefined,
          uniqueMechanism: valueProp.uniqueMechanism ?? undefined,
          differentiators: (valueProp.differentiators as string[] | null) ?? undefined,
        }
      : null,
    existingSegments: segments.map(s => ({
      segmentName: s.segmentName,
      personaName: s.personaName,
      summary: s.summary,
    })),
  }
}

// ---------------------------------------------------------------------------
// Evaluate whether inputs are sufficient for generation
// ---------------------------------------------------------------------------

export async function evaluateSegmentInputs(
  input: SegmentPromptInput,
  brandId: string
): Promise<SegmentEvaluationResult> {
  const context = await loadBusinessContext(brandId)

  const { object } = await generateObjectWithFallback<SegmentEvaluationResult>({
    model: MODELS.geminiPro,
    schema: segmentEvaluationSchema,
    system: SEGMENT_EVALUATION_SYSTEM_PROMPT,
    prompt: buildSegmentEvaluationUserMessage(input, context),
  }, { tag: 'GEN-01 evaluate' })

  return {
    ready: object.ready,
    questions: object.questions?.slice(0, 2), // hard cap at 2
  }
}

// ---------------------------------------------------------------------------
// Generate the full audience segment profile
// ---------------------------------------------------------------------------

export async function generateAudienceSegment(
  input: SegmentPromptInput,
  brandId: string
): Promise<SegmentGenerationOutput> {
  const context = await loadBusinessContext(brandId)

  const { object } = await generateObjectWithFallback<SegmentGenerationOutput>({
    model: MODELS.geminiPro,
    schema: segmentGenerationSchema,
    system: SEGMENT_GENERATION_SYSTEM_PROMPT,
    prompt: buildSegmentGenerationUserMessage(input, context),
  }, { tag: 'GEN-01 generate' })

  return object
}
