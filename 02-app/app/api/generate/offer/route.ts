import { db } from '@/lib/db'
import { dnaOffers } from '@/lib/db/schema/dna/offers'
import { dnaEntityOutcomes } from '@/lib/db/schema/dna/entity-outcomes'
import { eq } from 'drizzle-orm'
import {
  evaluateOfferInputs,
  generateOffer,
  generateCustomerJourney,
} from '@/lib/generation/offer'
import { getSegmentById } from '@/lib/db/queries/audience-segments'
import { getOfferById } from '@/lib/db/queries/offers'
import { listOutcomesByOffer } from '@/lib/db/queries/entity-outcomes'
import type { OfferPromptInput } from '@/lib/llm/prompts/offer'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

// ---------------------------------------------------------------------------
// POST /api/generate/offer
//
// Three modes:
//   { action: "evaluate", ... }        → check if inputs are sufficient
//   { action: "generate", ... }        → run full generation + save
//   { action: "generateJourney", ... } → generate customer journey for existing offer
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const body = await req.json()
  const action = body.action as string

  if (action === 'evaluate') {
    return handleEvaluate(body)
  }
  if (action === 'generate') {
    return handleGenerate(body)
  }
  if (action === 'generateJourney') {
    return handleGenerateJourney(body)
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 })
}

// ---------------------------------------------------------------------------
// Shared: build prompt input from request body
// ---------------------------------------------------------------------------

async function buildPromptInput(body: Record<string, unknown>): Promise<OfferPromptInput> {
  const {
    name,
    offerType,
    audienceSegmentId,
    vocMapping,
    followUpAnswers,
  } = body as {
    name: string
    offerType: string
    audienceSegmentId: string
    vocMapping: { problems: number[]; desires: number[]; objections: number[]; beliefs: number[] }
    followUpAnswers?: { question: string; answer: string }[]
  }

  const segment = await getSegmentById(audienceSegmentId)
  if (!segment) throw new Error('Audience segment not found')

  // Resolve VOC indexes to statement text
  const problems = (vocMapping.problems ?? [])
    .filter(i => i < (segment.problems as unknown[]).length)
    .map(i => (segment.problems as { text: string }[])[i]?.text ?? '')
    .filter(Boolean)

  const desires = (vocMapping.desires ?? [])
    .filter(i => i < (segment.desires as unknown[]).length)
    .map(i => (segment.desires as { text: string }[])[i]?.text ?? '')
    .filter(Boolean)

  const objections = (vocMapping.objections ?? [])
    .filter(i => i < (segment.objections as unknown[]).length)
    .map(i => (segment.objections as { objection: string }[])[i]?.objection ?? '')
    .filter(Boolean)

  const beliefs = (vocMapping.beliefs ?? [])
    .filter(i => i < (segment.sharedBeliefs as unknown[]).length)
    .map(i => (segment.sharedBeliefs as { text: string }[])[i]?.text ?? '')
    .filter(Boolean)

  return {
    name,
    offerType,
    audienceSegmentName: segment.segmentName,
    audienceRoleContext: segment.roleContext ?? '',
    vocStatements: { problems, desires, objections, beliefs },
    followUpAnswers,
  }
}

// ---------------------------------------------------------------------------
// Evaluate
// ---------------------------------------------------------------------------

async function handleEvaluate(body: Record<string, unknown>) {
  try {
    const input = await buildPromptInput(body)
    const result = await evaluateOfferInputs(input, BRAND_ID)
    return Response.json(result)
  } catch (err) {
    console.error('[DNA-04] Evaluation failed:', err)
    return Response.json(
      { error: 'Evaluation failed. Please try again.' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// Generate
// ---------------------------------------------------------------------------

async function handleGenerate(body: Record<string, unknown>) {
  const { offerId } = body as { offerId: string }

  if (!offerId) {
    return Response.json({ error: 'offerId is required' }, { status: 400 })
  }

  try {
    const input = await buildPromptInput(body)

    console.log(`[DNA-04] Starting generation for offer ${offerId}: "${input.name}" (${input.offerType})`)

    const profile = await generateOffer(input, BRAND_ID)
    console.log(`[DNA-04] Profile generated for "${input.name}"`)

    // Save profile to DB
    await db
      .update(dnaOffers)
      .set({
        overview: profile.overview,
        usp: profile.usp,
        uspExplanation: profile.uspExplanation,
        cta: profile.cta,
        pricing: profile.pricing,
        guarantee: profile.guarantee,
        scarcity: profile.scarcity ?? null,
        salesFunnelNotes: profile.salesFunnelNotes ?? null,
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(dnaOffers.id, offerId))

    // Save entity outcomes
    if (profile.entityOutcomes && profile.entityOutcomes.length > 0) {
      const outcomeValues = profile.entityOutcomes.map((eo, idx) => ({
        brandId: BRAND_ID,
        offerId: offerId,
        kind: eo.kind,
        body: eo.body,
        question: eo.question ?? null,
        faqType: eo.faqType ?? null,
        objectionAddressed: eo.objectionAddressed ?? null,
        valueStatement: eo.valueStatement ?? null,
        category: eo.category ?? null,
        sortOrder: idx + 1,
      }))

      await db.insert(dnaEntityOutcomes).values(outcomeValues)
    }

    console.log(`[DNA-04] Complete: ${offerId}`)
    return Response.json({ offerId, success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[DNA-04] FAILED: ${message}`)
    if (err instanceof Error && err.stack) console.error(err.stack)

    return Response.json(
      { error: 'Generation failed. Please try again.' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// Generate customer journey
// ---------------------------------------------------------------------------

async function handleGenerateJourney(body: Record<string, unknown>) {
  const { offerId } = body as { offerId: string }

  if (!offerId) {
    return Response.json({ error: 'offerId is required' }, { status: 400 })
  }

  try {
    const offer = await getOfferById(offerId)
    if (!offer) {
      return Response.json({ error: 'Offer not found' }, { status: 404 })
    }

    // Need the primary audience segment
    const primaryAudienceId = offer.targetAudienceIds?.[0]
    if (!primaryAudienceId) {
      return Response.json({ error: 'Offer has no primary audience segment' }, { status: 400 })
    }

    const segment = await getSegmentById(primaryAudienceId)
    if (!segment) {
      return Response.json({ error: 'Audience segment not found' }, { status: 404 })
    }

    // Get outcomes for summary
    const outcomes = await listOutcomesByOffer(offerId)
    const outcomeSummary = outcomes
      .filter(o => o.kind === 'outcome')
      .map(o => `- ${o.body}`)
      .join('\n')

    // Resolve VOC mapping to text
    const vocMapping = offer.vocMapping
    const problems = vocMapping
      ? (vocMapping.problems ?? [])
          .filter(i => i < (segment.problems as unknown[]).length)
          .map(i => (segment.problems as { text: string }[])[i]?.text ?? '')
          .filter(Boolean)
      : []
    const desires = vocMapping
      ? (vocMapping.desires ?? [])
          .filter(i => i < (segment.desires as unknown[]).length)
          .map(i => (segment.desires as { text: string }[])[i]?.text ?? '')
          .filter(Boolean)
      : []

    console.log(`[DNA-04] Generating customer journey for offer ${offerId}`)

    const result = await generateCustomerJourney({
      offerName: offer.name,
      offerType: offer.offerType,
      overview: offer.overview ?? '',
      usp: offer.usp ?? '',
      audienceSegmentName: segment.segmentName,
      audienceRoleContext: segment.roleContext ?? '',
      vocStatements: { problems, desires },
      outcomeSummary,
    })

    // Save to DB
    await db
      .update(dnaOffers)
      .set({
        customerJourney: result.stages,
        updatedAt: new Date(),
      })
      .where(eq(dnaOffers.id, offerId))

    console.log(`[DNA-04] Journey generated for offer ${offerId}`)
    return Response.json({ offerId, success: true, stages: result.stages })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[DNA-04] Journey generation FAILED: ${message}`)

    return Response.json(
      { error: 'Journey generation failed. Please try again.' },
      { status: 500 }
    )
  }
}
