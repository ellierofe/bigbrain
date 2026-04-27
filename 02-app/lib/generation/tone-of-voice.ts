import { generateObject } from 'ai'
import { MODELS } from '@/lib/llm/client'
import {
  TOV_GENERATION_SYSTEM_PROMPT,
  buildTovGenerationUserMessage,
} from '@/lib/llm/prompts/tone-of-voice'
import { tovGenerationSchema, type TovGenerationOutput } from '@/lib/types/generation'
import { listSamples } from '@/lib/db/queries/tone-of-voice'

/**
 * Generate a fresh tone-of-voice profile from the brand's current writing samples.
 * Returns the structured output without persisting — the action layer decides
 * whether to insert as a draft.
 */
export async function generateToneOfVoiceFromSamples(
  brandId: string
): Promise<TovGenerationOutput> {
  const samples = await listSamples(brandId)
  if (samples.length === 0) {
    throw new Error('No writing samples found. Add samples before regenerating.')
  }

  const promptInput = samples.map((s) => ({
    formatType: s.formatType,
    subtype: s.subtype,
    body: s.body,
    notes: s.notes,
    sourceContext: s.sourceContext,
  }))

  const { object } = await generateObject({
    model: MODELS.primary,
    schema: tovGenerationSchema,
    system: TOV_GENERATION_SYSTEM_PROMPT,
    prompt: buildTovGenerationUserMessage(promptInput),
  })

  return object
}
