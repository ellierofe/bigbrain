import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { dnaAudienceSegments } from '@/lib/db/schema/dna/audience-segments'
import { generateAudienceSegment } from '@/lib/generation/audience-segment'
import { logEntityWrite } from '../audit'
import type { PluralEntityWrites, WriteContext, WriteResult } from '../types'

const ENTITY_TYPE = 'dna_audience_segment' as const
const REVALIDATE_PATHS = ['/dna/audience-segments'] as const

export const WRITABLE_FIELDS = new Set([
  'segmentName',
  'personaName',
  'summary',
  'roleContext',
  'demographics',
  'psychographics',
  'problems',
  'desires',
  'objections',
  'sharedBeliefs',
  'status',
  'sortOrder',
])

async function getRow(id: string) {
  const rows = await db.select().from(dnaAudienceSegments).where(eq(dnaAudienceSegments.id, id)).limit(1)
  return rows[0] ?? null
}

async function getCurrentValue(id: string, field: string): Promise<unknown> {
  if (!WRITABLE_FIELDS.has(field)) return null
  const row = await getRow(id)
  if (!row) return null
  return (row as Record<string, unknown>)[field] ?? null
}

async function updateField(
  id: string,
  field: string,
  value: unknown,
  ctx: WriteContext
): Promise<WriteResult> {
  if (!WRITABLE_FIELDS.has(field)) {
    return { ok: false, error: `Field '${field}' is not editable on audience segment.`, code: 'field_not_writable' }
  }

  try {
    const existing = await getRow(id)
    if (!existing) {
      return { ok: false, error: `Audience segment ${id} not found.`, code: 'not_found' }
    }
    const before = (existing as Record<string, unknown>)[field]

    await db
      .update(dnaAudienceSegments)
      .set({ [field]: value, updatedAt: new Date() })
      .where(eq(dnaAudienceSegments.id, id))

    await logEntityWrite({
      brandId: ctx.brandId,
      entityType: ENTITY_TYPE,
      entityId: id,
      op: 'update',
      field,
      before,
      after: value,
      actor: ctx.actor,
    })

    return { ok: true, data: undefined, pathsToRevalidate: [...REVALIDATE_PATHS, `/dna/audience-segments/${id}`] }
  } catch (err) {
    console.error('[writes] audience-segment updateField failed', err)
    return { ok: false, error: 'Save failed. Please try again.', code: 'internal' }
  }
}

/**
 * Direct create — caller has all required fields. For LLM-driven creates
 * where only seed inputs are known, use `kickoffGeneration` below.
 */
async function create(
  payload: Record<string, unknown>,
  ctx: WriteContext
): Promise<WriteResult<{ id: string }>> {
  try {
    const segmentName = (payload.segmentName as string | undefined) ?? 'Untitled segment'
    const roleContext = (payload.roleContext as string | undefined) ?? ''

    const rows = await db
      .insert(dnaAudienceSegments)
      .values({
        brandId: ctx.brandId,
        segmentName,
        personaName: (payload.personaName as string | undefined) ?? null,
        summary: (payload.summary as string | undefined) ?? null,
        roleContext,
        demographics: (payload.demographics as object | undefined) ?? null,
        psychographics: (payload.psychographics as object | undefined) ?? null,
        problems: (payload.problems as unknown[] | undefined) ?? [],
        desires: (payload.desires as unknown[] | undefined) ?? [],
        objections: (payload.objections as unknown[] | undefined) ?? [],
        sharedBeliefs: (payload.sharedBeliefs as unknown[] | undefined) ?? [],
        status: 'draft',
      })
      .returning({ id: dnaAudienceSegments.id })

    const id = rows[0].id

    await logEntityWrite({
      brandId: ctx.brandId,
      entityType: ENTITY_TYPE,
      entityId: id,
      op: 'create',
      field: null,
      before: null,
      after: payload,
      actor: ctx.actor,
    })

    return { ok: true, data: { id }, pathsToRevalidate: [...REVALIDATE_PATHS] }
  } catch (err) {
    console.error('[writes] audience-segment create failed', err)
    return { ok: false, error: 'Create failed. Please try again.', code: 'internal' }
  }
}

/**
 * Generation kickoff — creates a placeholder row, runs the existing GEN-01
 * pipeline synchronously to populate it, returns the final id. This call
 * blocks for ~30s; the layout shows the loading state on the pending-write
 * card during this wait. Async/job-queue migration is a v1.1 concern.
 */
export async function kickoffGeneration(
  seed: { roleContext: string; biggestProblem?: string; biggestDesire?: string },
  ctx: WriteContext
): Promise<WriteResult<{ id: string; segmentName: string }>> {
  try {
    // 1. Create placeholder
    const rows = await db
      .insert(dnaAudienceSegments)
      .values({
        brandId: ctx.brandId,
        segmentName: 'Generating…',
        roleContext: seed.roleContext,
        problems: [],
        desires: [],
        objections: [],
        sharedBeliefs: [],
        status: 'draft',
      })
      .returning({ id: dnaAudienceSegments.id })

    const id = rows[0].id

    // 2. Run generation (existing GEN-01 path)
    const profile = await generateAudienceSegment(
      {
        roleContext: seed.roleContext,
        biggestProblem: seed.biggestProblem,
        biggestDesire: seed.biggestDesire,
      },
      ctx.brandId
    )

    // 3. Save profile (skip avatar to keep latency in budget — can be regenerated from segment detail)
    await db
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
      .where(eq(dnaAudienceSegments.id, id))

    await logEntityWrite({
      brandId: ctx.brandId,
      entityType: ENTITY_TYPE,
      entityId: id,
      op: 'create',
      field: null,
      before: null,
      after: { ...profile, generatedFromSeed: seed },
      actor: ctx.actor,
    })

    return { ok: true, data: { id, segmentName: profile.segmentName }, pathsToRevalidate: [...REVALIDATE_PATHS] }
  } catch (err) {
    console.error('[writes] audience-segment kickoffGeneration failed', err)
    return { ok: false, error: 'Generation failed. Please try again.', code: 'internal' }
  }
}

export const audienceSegmentWrites: PluralEntityWrites = {
  isSingular: false,
  entityType: ENTITY_TYPE,
  WRITABLE_FIELDS,
  getCurrentValue,
  updateField,
  create,
}
