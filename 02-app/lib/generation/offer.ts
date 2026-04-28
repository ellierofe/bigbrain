import { MODELS, generateObjectWithFallback } from '@/lib/llm/client'
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

  const { object } = await generateObjectWithFallback<OfferEvaluationResult>({
    model: MODELS.geminiPro,
    schema: offerEvaluationSchema,
    system: OFFER_EVALUATION_SYSTEM_PROMPT,
    prompt: buildOfferEvaluationUserMessage(input, context),
  }, { tag: 'DNA-04 evaluate' })

  return object
}

// ---------------------------------------------------------------------------
// Generate the full offer profile
// ---------------------------------------------------------------------------

export async function generateOffer(
  input: OfferPromptInput,
  brandId: string
): Promise<OfferGenerationOutput> {
  const context = await loadBusinessContext(brandId)

  const { object } = await generateObjectWithFallback<OfferGenerationOutput>({
    model: MODELS.geminiPro,
    schema: offerGenerationSchema,
    system: OFFER_GENERATION_SYSTEM_PROMPT,
    prompt: buildOfferGenerationUserMessage(input, context),
  }, { tag: 'DNA-04 generate' })

  return object
}

// ---------------------------------------------------------------------------
// Generate customer journey
// ---------------------------------------------------------------------------

export async function generateCustomerJourney(
  input: JourneyPromptInput
): Promise<OfferJourneyOutput> {
  const { object } = await generateObjectWithFallback<OfferJourneyOutput>({
    model: MODELS.geminiPro,
    schema: offerJourneySchema,
    system: JOURNEY_GENERATION_SYSTEM_PROMPT,
    prompt: buildJourneyUserMessage(input),
  }, { tag: 'DNA-04 journey' })

  return object
}
