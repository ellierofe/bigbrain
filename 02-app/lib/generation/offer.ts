import { generateObject } from 'ai'
import { MODELS } from '@/lib/llm/client'
import {
  OFFER_GENERATION_SYSTEM_PROMPT,
  OFFER_EVALUATION_SYSTEM_PROMPT,
  JOURNEY_GENERATION_SYSTEM_PROMPT,
  buildOfferGenerationUserMessage,
  buildOfferEvaluationUserMessage,
  buildJourneyUserMessage,
  type OfferPromptInput,
  type OfferPromptContext,
  type JourneyPromptInput,
} from '@/lib/llm/prompts/offer'
import {
  offerGenerationSchema,
  offerEvaluationSchema,
  offerJourneySchema,
  type OfferGenerationOutput,
  type OfferEvaluationResult,
  type OfferJourneyOutput,
} from '@/lib/types/generation-offer'
import { getBusinessOverview } from '@/lib/db/queries/dna-singular'
import { listOffers } from '@/lib/db/queries/offers'

// ---------------------------------------------------------------------------
// Load business context for prompt injection
// ---------------------------------------------------------------------------

async function loadBusinessContext(brandId: string): Promise<OfferPromptContext> {
  const [business, offers] = await Promise.all([
    getBusinessOverview(brandId),
    listOffers(brandId),
  ])

  return {
    business: business
      ? {
          businessName: business.businessName ?? undefined,
          vertical: business.vertical ?? undefined,
          specialism: business.specialism ?? undefined,
          shortDescription: business.shortDescription ?? undefined,
        }
      : null,
    existingOffers: offers.map(o => ({
      name: o.name,
      offerType: o.offerType,
      overview: o.overview,
    })),
  }
}

// ---------------------------------------------------------------------------
// Evaluate whether inputs are sufficient for generation
// ---------------------------------------------------------------------------

export async function evaluateOfferInputs(
  input: OfferPromptInput,
  brandId: string
): Promise<OfferEvaluationResult> {
  const context = await loadBusinessContext(brandId)

  const { object } = await generateObject({
    model: MODELS.geminiPro,
    schema: offerEvaluationSchema,
    system: OFFER_EVALUATION_SYSTEM_PROMPT,
    prompt: buildOfferEvaluationUserMessage(input, context),
  })

  return object as OfferEvaluationResult
}

// ---------------------------------------------------------------------------
// Generate the full offer profile
// ---------------------------------------------------------------------------

export async function generateOffer(
  input: OfferPromptInput,
  brandId: string
): Promise<OfferGenerationOutput> {
  const context = await loadBusinessContext(brandId)

  const { object } = await generateObject({
    model: MODELS.geminiPro,
    schema: offerGenerationSchema,
    system: OFFER_GENERATION_SYSTEM_PROMPT,
    prompt: buildOfferGenerationUserMessage(input, context),
  })

  return object as OfferGenerationOutput
}

// ---------------------------------------------------------------------------
// Generate customer journey
// ---------------------------------------------------------------------------

export async function generateCustomerJourney(
  input: JourneyPromptInput
): Promise<OfferJourneyOutput> {
  const { object } = await generateObject({
    model: MODELS.geminiPro,
    schema: offerJourneySchema,
    system: JOURNEY_GENERATION_SYSTEM_PROMPT,
    prompt: buildJourneyUserMessage(input),
  })

  return object as OfferJourneyOutput
}
