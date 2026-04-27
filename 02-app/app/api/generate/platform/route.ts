import { db } from '@/lib/db'
import { dnaPlatforms } from '@/lib/db/schema/dna/platforms'
import { eq } from 'drizzle-orm'
import {
  evaluatePlatformInputs,
  generatePlatformStrategy,
} from '@/lib/generation/platform'
import { getSourcesByIds } from '@/lib/db/queries/sources'
import type { GeneratePlatformInput } from '@/lib/types/generation'
import { validateCategoryChannelPair } from '@/lib/types/channels'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

// ---------------------------------------------------------------------------
// POST /api/generate/platform
//
// Two modes:
//   { action: "evaluate", ... }  → check if inputs are sufficient
//   { action: "generate", ... }  → run full generation + save
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

  return Response.json({ error: 'Invalid action' }, { status: 400 })
}

// ---------------------------------------------------------------------------
// Load source document texts (if any IDs provided)
// ---------------------------------------------------------------------------

async function loadSourceDocTexts(ids?: string[]): Promise<string[] | undefined> {
  if (!ids || ids.length === 0) return undefined
  const docs = await getSourcesByIds(ids)
  const texts = docs
    .map(d => d.extractedText)
    .filter((t): t is string => !!t)
  return texts.length > 0 ? texts : undefined
}

// ---------------------------------------------------------------------------
// Evaluate — lightweight LLM call to check if follow-ups are needed
// ---------------------------------------------------------------------------

async function handleEvaluate(body: Record<string, unknown>) {
  const { name, category, channel, primaryObjective, audience, sourceDocumentIds } =
    body as Partial<GeneratePlatformInput> & { sourceDocumentIds?: string[] }

  if (!name || typeof name !== 'string') {
    return Response.json({ error: 'name is required' }, { status: 400 })
  }
  if (!category || typeof category !== 'string') {
    return Response.json({ error: 'category is required' }, { status: 400 })
  }
  if (!channel || typeof channel !== 'string') {
    return Response.json({ error: 'channel is required' }, { status: 400 })
  }
  if (!validateCategoryChannelPair(category, channel)) {
    return Response.json({ error: `Invalid category/channel pair: ${category}/${channel}.` }, { status: 400 })
  }

  try {
    const sourceDocTexts = await loadSourceDocTexts(sourceDocumentIds)

    const result = await evaluatePlatformInputs(
      {
        name,
        category,
        channel,
        primaryObjective: primaryObjective || undefined,
        audience: audience || undefined,
        sourceDocTexts,
      },
      BRAND_ID
    )

    return Response.json(result)
  } catch (err) {
    console.error('[GEN-PLATFORM] Evaluation failed:', err)
    return Response.json(
      { error: 'Evaluation failed. Please try again.' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// Generate — full strategy generation + DB save
// ---------------------------------------------------------------------------

async function handleGenerate(body: Record<string, unknown>) {
  const {
    name,
    category,
    channel,
    handle,
    primaryObjective,
    audience,
    followUpAnswers,
    sourceDocumentIds,
  } = body as Partial<GeneratePlatformInput> & { sourceDocumentIds?: string[] }

  if (!name || typeof name !== 'string') {
    return Response.json({ error: 'name is required' }, { status: 400 })
  }
  if (!category || typeof category !== 'string') {
    return Response.json({ error: 'category is required' }, { status: 400 })
  }
  if (!channel || typeof channel !== 'string') {
    return Response.json({ error: 'channel is required' }, { status: 400 })
  }
  if (!validateCategoryChannelPair(category, channel)) {
    return Response.json({ error: `Invalid category/channel pair: ${category}/${channel}.` }, { status: 400 })
  }

  let platformId: string | null = null

  try {
    // 1. Load source doc content
    const sourceDocTexts = await loadSourceDocTexts(sourceDocumentIds)

    // 2. Create a placeholder row
    console.log('[GEN-PLATFORM] Creating placeholder channel row...')
    const rows = await db
      .insert(dnaPlatforms)
      .values({
        brandId: BRAND_ID,
        name,
        category,
        channel,
        handle: handle || null,
        sourceDocumentIds: sourceDocumentIds || null,
        isActive: false,
      })
      .returning({ id: dnaPlatforms.id })

    platformId = rows[0].id
    console.log(`[GEN-PLATFORM] Placeholder created: ${platformId}`)

    // 3. Generate the full strategy
    console.log('[GEN-PLATFORM] Starting strategy generation...')
    const strategy = await generatePlatformStrategy(
      {
        name,
        category,
        channel,
        handle: handle || undefined,
        primaryObjective: primaryObjective || undefined,
        audience: audience || undefined,
        followUpAnswers: followUpAnswers || undefined,
        sourceDocTexts,
      },
      BRAND_ID
    )
    console.log(`[GEN-PLATFORM] Strategy generated for "${name}"`)

    // 4. Save the generated strategy
    console.log('[GEN-PLATFORM] Saving strategy...')
    await db
      .update(dnaPlatforms)
      .set({
        primaryObjective: strategy.primaryObjective,
        audience: strategy.audience,
        contentStrategy: strategy.contentStrategy,
        postingFrequency: strategy.postingFrequency,
        customerJourneyStage: strategy.customerJourneyStage,
        growthFunction: strategy.growthFunction,
        usp: strategy.usp,
        engagementApproach: strategy.engagementApproach,
        hashtagStrategy: strategy.hashtagStrategy || null,
        contentFormats: strategy.contentFormats,
        subtopicIdeas: strategy.subtopicIdeas,
        structureAndFeatures: strategy.structureAndFeatures,
        characterLimits: strategy.characterLimits,
        doNotDo: strategy.doNotDo,
        analyticsGoals: strategy.analyticsGoals,
        contentPillarThemes: strategy.contentPillarThemes || null,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(dnaPlatforms.id, platformId))

    console.log(`[GEN-PLATFORM] Complete: ${platformId}`)
    return Response.json({ platformId, success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[GEN-PLATFORM] FAILED: ${message}`)
    if (err instanceof Error && err.stack) console.error(err.stack)

    // Clean up orphaned placeholder row
    if (platformId) {
      try {
        await db
          .delete(dnaPlatforms)
          .where(eq(dnaPlatforms.id, platformId))
        console.log(`[GEN-PLATFORM] Cleaned up orphaned row: ${platformId}`)
      } catch {
        console.error(`[GEN-PLATFORM] Failed to clean up orphaned row: ${platformId}`)
      }
    }

    return Response.json(
      { error: 'Generation failed. Please try again.' },
      { status: 500 }
    )
  }
}
