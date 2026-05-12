'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { dnaAudienceSegments } from '@/lib/db/schema/dna/audience-segments'
import {
  getSegmentById,
  countActiveSegments,
  getSegmentDependents,
  updateSegmentVoc,
  archiveSegment,
  activateSegment,
} from '@/lib/db/queries/audience-segments'
import { audienceSegmentWrites, type WriteContext } from '@/lib/db/writes'
import type {
  CreateSegmentInput,
  VocType,
  VocItem,
} from '@/lib/types/audience-segments'

/** Hardcoded brand ID for single-user app. Replaced with session lookup once INF-05 is live. */
const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

/** Create a new segment (Save as draft flow from the creation modal) */
export async function createSegment(
  input: CreateSegmentInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const problems = input.biggestProblem
      ? [{ text: input.biggestProblem, category: 'practical' as const }]
      : []
    const desires = input.biggestDesire
      ? [{ text: input.biggestDesire, category: 'practical' as const }]
      : []

    const rows = await db
      .insert(dnaAudienceSegments)
      .values({
        brandId: BRAND_ID,
        segmentName: input.segmentName || 'Untitled segment',
        roleContext: input.roleContext,
        demographics: input.demographics ?? null,
        problems,
        desires,
        objections: [],
        sharedBeliefs: [],
        status: 'draft',
      })
      .returning({ id: dnaAudienceSegments.id })

    revalidatePath('/dna/audience-segments')
    return { ok: true, data: { id: rows[0].id } }
  } catch (err) {
    console.error('createSegment error', err)
    return { ok: false, error: 'Failed to create segment. Please try again.' }
  }
}

/** Save all LLM-generated fields to a segment row */
export async function saveGeneratedSegment(
  id: string,
  data: {
    segmentName: string
    personaName: string
    summary: string
    roleContext: string
    demographics: Record<string, unknown>
    psychographics: Record<string, unknown>
    problems: unknown[]
    desires: unknown[]
    objections: unknown[]
    sharedBeliefs: unknown[]
    avatarPrompt: string
  }
): Promise<ActionResult> {
  try {
    await db
      .update(dnaAudienceSegments)
      .set({
        segmentName: data.segmentName,
        personaName: data.personaName,
        summary: data.summary,
        roleContext: data.roleContext,
        demographics: data.demographics,
        psychographics: data.psychographics,
        problems: data.problems,
        desires: data.desires,
        objections: data.objections,
        sharedBeliefs: data.sharedBeliefs,
        avatarPrompt: data.avatarPrompt,
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(dnaAudienceSegments.id, id))

    revalidatePath('/dna/audience-segments')
    revalidatePath(`/dna/audience-segments/${id}`)
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('saveGeneratedSegment error', err)
    return { ok: false, error: 'Failed to save generated segment.' }
  }
}

/** Save the avatar URL after async image generation */
export async function saveSegmentAvatarUrl(
  id: string,
  avatarUrl: string
): Promise<ActionResult> {
  try {
    await db
      .update(dnaAudienceSegments)
      .set({ avatarUrl, updatedAt: new Date() })
      .where(eq(dnaAudienceSegments.id, id))

    revalidatePath(`/dna/audience-segments/${id}`)
    revalidatePath('/dna/audience-segments')
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('saveSegmentAvatarUrl error', err)
    return { ok: false, error: 'Failed to save avatar.' }
  }
}

/** Autosave a single scalar field (segment name, persona name, summary, role context, etc.) */
export async function saveSegmentField(
  id: string,
  field: string,
  value: string | null
): Promise<ActionResult> {
  const writeCtx: WriteContext = {
    actor: `ui:/dna/audience-segments/${id}`,
    brandId: BRAND_ID,
  }
  const result = await audienceSegmentWrites.updateField(id, field, value, writeCtx)
  if (!result.ok) {
    return { ok: false, error: result.error }
  }
  for (const path of result.pathsToRevalidate) revalidatePath(path)
  return { ok: true, data: undefined }
}

/** Save a JSONB demographics or psychographics blob */
export async function saveSegmentJsonField(
  id: string,
  field: 'demographics' | 'psychographics',
  value: Record<string, string | null>
): Promise<ActionResult> {
  const writeCtx: WriteContext = {
    actor: `ui:/dna/audience-segments/${id}`,
    brandId: BRAND_ID,
  }
  const result = await audienceSegmentWrites.updateField(id, field, value, writeCtx)
  if (!result.ok) {
    return { ok: false, error: result.error }
  }
  for (const path of result.pathsToRevalidate) revalidatePath(path)
  return { ok: true, data: undefined }
}

/** Replace a full VOC array column */
export async function saveVocItems(
  id: string,
  vocType: VocType,
  items: VocItem[]
): Promise<ActionResult> {
  try {
    await updateSegmentVoc(id, vocType, items)
    revalidatePath(`/dna/audience-segments/${id}`)
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('saveVocItems error', err)
    return { ok: false, error: 'Save failed. Please try again.' }
  }
}

/** Archive a segment. Returns dependents if any exist, does NOT archive — caller shows modal. */
export async function checkAndArchiveSegment(
  id: string
): Promise<ActionResult<{ dependents: { name: string; type: string }[] }>> {
  try {
    const segment = await getSegmentById(id)
    if (!segment) return { ok: false, error: 'Segment not found.' }

    const activeCount = await countActiveSegments(segment.brandId)
    if (segment.status === 'active' && activeCount <= 1) {
      return {
        ok: false,
        error: 'You must have at least one active audience segment.',
      }
    }

    const dependents = await getSegmentDependents(id)
    return { ok: true, data: { dependents } }
  } catch (err) {
    console.error('checkAndArchiveSegment error', err)
    return { ok: false, error: 'Could not check dependents. Please try again.' }
  }
}

/** Confirm archive after user has acknowledged dependents in the modal */
export async function confirmArchiveSegment(
  id: string
): Promise<ActionResult<{ nextId: string | null }>> {
  try {
    const segment = await getSegmentById(id)
    if (!segment) return { ok: false, error: 'Segment not found.' }

    if (segment.status === 'active') {
      const activeCount = await countActiveSegments(segment.brandId)
      if (activeCount <= 1) {
        return { ok: false, error: 'You must have at least one active audience segment.' }
      }
    }

    await archiveSegment(id)
    revalidatePath('/dna/audience-segments')

    // Find next segment to redirect to
    const { listSegments } = await import('@/lib/db/queries/audience-segments')
    const remaining = await listSegments(segment.brandId)
    const nextId = remaining.length > 0 ? remaining[0].id : null

    return { ok: true, data: { nextId } }
  } catch (err) {
    console.error('confirmArchiveSegment error', err)
    return { ok: false, error: "Couldn't archive. Please try again." }
  }
}

/** Promote a draft segment to active */
export async function markSegmentActive(id: string): Promise<ActionResult> {
  try {
    await activateSegment(id)
    revalidatePath(`/dna/audience-segments/${id}`)
    revalidatePath('/dna/audience-segments')
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('markSegmentActive error', err)
    return { ok: false, error: 'Failed to activate segment. Please try again.' }
  }
}
