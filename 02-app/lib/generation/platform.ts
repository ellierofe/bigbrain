import { generateObject } from 'ai'
import { MODELS } from '@/lib/llm/client'
import {
  PLATFORM_GENERATION_SYSTEM_PROMPT,
  PLATFORM_EVALUATION_SYSTEM_PROMPT,
  buildPlatformGenerationUserMessage,
  buildPlatformEvaluationUserMessage,
  type PlatformPromptInput,
  type PlatformPromptContext,
} from '@/lib/llm/prompts/platform'
import {
  platformGenerationSchema,
  platformEvaluationSchema,
  type PlatformGenerationOutput,
  type PlatformEvaluationResult,
} from '@/lib/types/generation'
import { getBusinessOverview, getValueProposition } from '@/lib/db/queries/dna-singular'
import { listSegments } from '@/lib/db/queries/audience-segments'
import { listPlatforms } from '@/lib/db/queries/platforms'

// ---------------------------------------------------------------------------
// Load business context for prompt injection
// ---------------------------------------------------------------------------

async function loadBusinessContext(brandId: string): Promise<PlatformPromptContext> {
  const [business, valueProp, segments, platforms] = await Promise.all([
    getBusinessOverview(brandId),
    getValueProposition(brandId),
    listSegments(brandId),
    listPlatforms(brandId),
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
    existingPlatforms: platforms.map(p => ({
      name: p.name,
      category: p.category,
      channel: p.channel,
      primaryObjective: p.primaryObjective,
    })),
  }
}

// ---------------------------------------------------------------------------
// Evaluate whether inputs are sufficient for generation
// ---------------------------------------------------------------------------

export async function evaluatePlatformInputs(
  input: PlatformPromptInput,
  brandId: string
): Promise<PlatformEvaluationResult> {
  const context = await loadBusinessContext(brandId)

  const { object } = await generateObject({
    model: MODELS.geminiFlash,
    schema: platformEvaluationSchema,
    system: PLATFORM_EVALUATION_SYSTEM_PROMPT,
    prompt: buildPlatformEvaluationUserMessage(input, context),
  })

  return {
    ready: object.ready,
    questions: object.questions?.slice(0, 2),
  }
}

// ---------------------------------------------------------------------------
// Generate the full platform strategy
// ---------------------------------------------------------------------------

export async function generatePlatformStrategy(
  input: PlatformPromptInput,
  brandId: string
): Promise<PlatformGenerationOutput> {
  const context = await loadBusinessContext(brandId)

  const systemPrompt = PLATFORM_GENERATION_SYSTEM_PROMPT
  const userMessage = buildPlatformGenerationUserMessage(input, context)

  // Try Gemini Pro first, fall back to Claude Sonnet on failure
  try {
    console.log('[GEN-PLATFORM] Attempting Gemini Pro...')
    const { object } = await generateObject({
      model: MODELS.geminiPro,
      schema: platformGenerationSchema,
      system: systemPrompt,
      prompt: userMessage,
      maxRetries: 1,
    })
    return object
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`[GEN-PLATFORM] Gemini Pro failed: ${msg}`)
    console.log('[GEN-PLATFORM] Falling back to Claude Sonnet...')

    const { object } = await generateObject({
      model: MODELS.primary,
      schema: platformGenerationSchema,
      system: systemPrompt,
      prompt: userMessage,
    })
    return object
  }
}
