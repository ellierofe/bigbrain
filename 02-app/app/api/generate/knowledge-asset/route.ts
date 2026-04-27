import { db } from '@/lib/db'
import { dnaKnowledgeAssets } from '@/lib/db/schema/dna/knowledge-assets'
import { dnaEntityOutcomes } from '@/lib/db/schema/dna/entity-outcomes'
import { eq } from 'drizzle-orm'
import {
  evaluateAssetInputs,
  generateKnowledgeAsset,
} from '@/lib/generation/knowledge-asset'
import { getSegmentById } from '@/lib/db/queries/audience-segments'
import { getSourcesByIds } from '@/lib/db/queries/sources'
import type { AssetPromptInput } from '@/lib/llm/prompts/knowledge-asset'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

// ---------------------------------------------------------------------------
// POST /api/generate/knowledge-asset
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
// Shared: build prompt input from request body
// ---------------------------------------------------------------------------

async function buildPromptInput(body: Record<string, unknown>): Promise<AssetPromptInput> {
  const {
    name,
    kind,
    proprietary,
    audienceSegmentId,
    vocMapping,
    sourceDocumentIds,
    followUpAnswers,
  } = body as {
    name: string
    kind: string
    proprietary: boolean
    audienceSegmentId: string
    vocMapping: { problems: number[]; desires: number[]; objections: number[]; beliefs: number[] }
    sourceDocumentIds?: string[]
    followUpAnswers?: { question: string; answer: string }[]
  }

  // Load audience segment for VOC statements
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

  // Load source document text
  let sourceDocTexts: string[] | undefined
  if (sourceDocumentIds && sourceDocumentIds.length > 0) {
    const docs = await getSourcesByIds(sourceDocumentIds)
    sourceDocTexts = docs
      .map(d => d.extractedText)
      .filter((t): t is string => !!t)
  }

  return {
    name,
    kind,
    proprietary: proprietary ?? true,
    audienceSegmentName: segment.segmentName,
    audienceRoleContext: segment.roleContext ?? '',
    vocStatements: { problems, desires, objections, beliefs },
    sourceDocTexts,
    followUpAnswers,
  }
}

// ---------------------------------------------------------------------------
// Evaluate
// ---------------------------------------------------------------------------

async function handleEvaluate(body: Record<string, unknown>) {
  try {
    const input = await buildPromptInput(body)
    const result = await evaluateAssetInputs(input, BRAND_ID)
    return Response.json(result)
  } catch (err) {
    console.error('[DNA-05] Evaluation failed:', err)
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
  const { assetId } = body as { assetId: string }

  if (!assetId) {
    return Response.json({ error: 'assetId is required' }, { status: 400 })
  }

  try {
    const input = await buildPromptInput(body)

    console.log(`[DNA-05] Starting generation for asset ${assetId}: "${input.name}" (${input.kind})`)

    // Generate the full profile
    const profile = await generateKnowledgeAsset(input, BRAND_ID)
    console.log(`[DNA-05] Profile generated for "${input.name}"`)

    // Save profile to DB
    await db
      .update(dnaKnowledgeAssets)
      .set({
        summary: profile.summary,
        principles: profile.principles,
        origin: profile.origin,
        keyComponents: profile.keyComponents,
        flow: profile.flow,
        objectives: profile.objectives,
        problemsSolved: profile.problemsSolved,
        contexts: profile.contexts,
        priorKnowledge: profile.priorKnowledge ?? null,
        resources: profile.resources ?? null,
        detail: profile.detail,
        faqs: profile.faqs,
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(dnaKnowledgeAssets.id, assetId))

    // Save entity outcomes — three separate arrays from generation
    const allOutcomeValues = [
      ...(profile.outcomes ?? []).map((o, idx) => ({
        brandId: BRAND_ID,
        knowledgeAssetId: assetId,
        kind: 'outcome' as const,
        body: o.body,
        category: o.category ?? null,
        sortOrder: idx + 1,
      })),
      ...(profile.benefits ?? []).map((b, idx) => ({
        brandId: BRAND_ID,
        knowledgeAssetId: assetId,
        kind: 'benefit' as const,
        body: b.body,
        category: b.category ?? null,
        sortOrder: idx + 1,
      })),
      ...(profile.advantages ?? []).map((a, idx) => ({
        brandId: BRAND_ID,
        knowledgeAssetId: assetId,
        kind: 'advantage' as const,
        body: a.body,
        category: null,
        sortOrder: idx + 1,
      })),
    ]

    if (allOutcomeValues.length > 0) {
      await db.insert(dnaEntityOutcomes).values(allOutcomeValues)
    }

    console.log(`[DNA-05] Complete: ${assetId}`)
    return Response.json({ assetId, success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[DNA-05] FAILED: ${message}`)
    if (err instanceof Error && err.stack) console.error(err.stack)

    return Response.json(
      { error: 'Generation failed. Please try again.' },
      { status: 500 }
    )
  }
}
