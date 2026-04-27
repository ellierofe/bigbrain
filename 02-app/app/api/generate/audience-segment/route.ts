import { db } from '@/lib/db'
import { dnaAudienceSegments } from '@/lib/db/schema/dna/audience-segments'
import { eq } from 'drizzle-orm'
import {
  evaluateSegmentInputs,
  generateAudienceSegment,
} from '@/lib/generation/audience-segment'
import { generateAvatar } from '@/lib/generation/avatar'
import type { GenerateSegmentInput } from '@/lib/types/generation'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

// ---------------------------------------------------------------------------
// POST /api/generate/audience-segment
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
// Evaluate — lightweight LLM call to check if follow-ups are needed
// ---------------------------------------------------------------------------

async function handleEvaluate(body: Record<string, unknown>) {
  const { roleContext, biggestProblem, biggestDesire } = body as Partial<GenerateSegmentInput>

  if (!roleContext || typeof roleContext !== 'string') {
    return Response.json({ error: 'roleContext is required' }, { status: 400 })
  }

  try {
    const result = await evaluateSegmentInputs(
      {
        roleContext,
        biggestProblem: biggestProblem || undefined,
        biggestDesire: biggestDesire || undefined,
      },
      BRAND_ID
    )

    return Response.json(result)
  } catch (err) {
    console.error('Segment evaluation failed:', err)
    return Response.json(
      { error: 'Evaluation failed. Please try again.' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// Generate — full profile generation + DB save + avatar generation
// ---------------------------------------------------------------------------

async function handleGenerate(body: Record<string, unknown>) {
  const {
    roleContext,
    biggestProblem,
    biggestDesire,
    followUpAnswers,
  } = body as Partial<GenerateSegmentInput>

  if (!roleContext || typeof roleContext !== 'string') {
    return Response.json({ error: 'roleContext is required' }, { status: 400 })
  }

  let segmentId: string | null = null

  try {
    // 1. Create a placeholder row to get an ID (for avatar path)
    console.log('[GEN-01] Creating placeholder segment row...')
    const rows = await db
      .insert(dnaAudienceSegments)
      .values({
        brandId: BRAND_ID,
        segmentName: 'Generating...',
        roleContext,
        problems: [],
        desires: [],
        objections: [],
        sharedBeliefs: [],
        status: 'draft',
      })
      .returning({ id: dnaAudienceSegments.id })

    segmentId = rows[0].id
    console.log(`[GEN-01] Placeholder created: ${segmentId}`)

    // 2. Generate the full profile
    console.log('[GEN-01] Starting profile generation...')
    const profile = await generateAudienceSegment(
      {
        roleContext,
        biggestProblem: biggestProblem || undefined,
        biggestDesire: biggestDesire || undefined,
        followUpAnswers: followUpAnswers || undefined,
      },
      BRAND_ID
    )
    console.log(`[GEN-01] Profile generated: "${profile.segmentName}"`)

    // 3. Save profile + generate avatar in parallel
    console.log('[GEN-01] Saving profile + generating avatar...')
    const [, avatarUrl] = await Promise.all([
      db
        .update(dnaAudienceSegments)
        .set({
          segmentName: profile.segmentName,
          personaName: profile.personaName,
          summary: profile.summary,
          roleContext: profile.roleContext,
          demographics: profile.demographics,
          psychographics: profile.psychographics,
          problems: profile.problems,
          desires: profile.desires,
          objections: profile.objections,
          sharedBeliefs: profile.sharedBeliefs,
          avatarPrompt: profile.avatarPrompt,
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(dnaAudienceSegments.id, segmentId)),
      generateAvatar(profile.avatarPrompt, segmentId),
    ])

    // 4. Save avatar URL if generation succeeded
    if (avatarUrl) {
      await db
        .update(dnaAudienceSegments)
        .set({ avatarUrl, updatedAt: new Date() })
        .where(eq(dnaAudienceSegments.id, segmentId))
      console.log('[GEN-01] Avatar saved')
    } else {
      console.log('[GEN-01] Avatar generation returned null (non-blocking)')
    }

    console.log(`[GEN-01] Complete: ${segmentId}`)
    return Response.json({ segmentId, success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[GEN-01] FAILED: ${message}`)
    if (err instanceof Error && err.stack) console.error(err.stack)

    // Clean up orphaned placeholder row
    if (segmentId) {
      try {
        await db
          .delete(dnaAudienceSegments)
          .where(eq(dnaAudienceSegments.id, segmentId))
        console.log(`[GEN-01] Cleaned up orphaned row: ${segmentId}`)
      } catch {
        console.error(`[GEN-01] Failed to clean up orphaned row: ${segmentId}`)
      }
    }

    return Response.json(
      { error: 'Generation failed. Please try again.' },
      { status: 500 }
    )
  }
}
