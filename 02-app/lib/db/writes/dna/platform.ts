import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { dnaPlatforms } from '@/lib/db/schema/dna/platforms'
import { logEntityWrite } from '../audit'
import type { PluralEntityWrites, WriteContext, WriteResult } from '../types'

const ENTITY_TYPE = 'dna_platform' as const
const REVALIDATE_PATHS = ['/dna/platforms'] as const

export const WRITABLE_FIELDS = new Set([
  'name',
  'category',
  'channel',
  'platformType',
  'handle',
  'isActive',
  'primaryObjective',
  'audience',
  'contentStrategy',
  'postingFrequency',
  'contentFormats',
  'characterLimits',
  'contentPillarIds',
  'hashtagStrategy',
  'engagementApproach',
  'customerJourneyStage',
  'growthFunction',
  'contentPillarThemes',
  'subtopicIdeas',
  'structureAndFeatures',
  'analyticsGoals',
  'performanceSummary',
  'doNotDo',
])

async function getRow(id: string) {
  const rows = await db.select().from(dnaPlatforms).where(eq(dnaPlatforms.id, id)).limit(1)
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
    return { ok: false, error: `Field '${field}' is not editable on platform.`, code: 'field_not_writable' }
  }

  try {
    const existing = await getRow(id)
    if (!existing) {
      return { ok: false, error: `Platform ${id} not found.`, code: 'not_found' }
    }
    const before = (existing as Record<string, unknown>)[field]

    await db
      .update(dnaPlatforms)
      .set({ [field]: value, updatedAt: new Date() })
      .where(eq(dnaPlatforms.id, id))

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

    return { ok: true, data: undefined, pathsToRevalidate: [...REVALIDATE_PATHS, `/dna/platforms/${id}`] }
  } catch (err) {
    console.error('[writes] platform updateField failed', err)
    return { ok: false, error: 'Save failed. Please try again.', code: 'internal' }
  }
}

async function create(
  payload: Record<string, unknown>,
  ctx: WriteContext
): Promise<WriteResult<{ id: string }>> {
  try {
    const name = payload.name as string | undefined
    const category = payload.category as string | undefined
    const channel = payload.channel as string | undefined

    if (!name || !category || !channel) {
      return {
        ok: false,
        error: 'Platform requires name, category, and channel.',
        code: 'validation',
      }
    }

    const rows = await db
      .insert(dnaPlatforms)
      .values({
        brandId: ctx.brandId,
        name,
        category,
        channel,
        platformType: (payload.platformType as string | undefined) ?? null,
        handle: (payload.handle as string | undefined) ?? null,
        isActive: (payload.isActive as boolean | undefined) ?? true,
        primaryObjective: (payload.primaryObjective as string | undefined) ?? null,
        audience: (payload.audience as string | undefined) ?? null,
        contentStrategy: (payload.contentStrategy as string | undefined) ?? null,
      })
      .returning({ id: dnaPlatforms.id })

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
    console.error('[writes] platform create failed', err)
    return { ok: false, error: 'Create failed. Please try again.', code: 'internal' }
  }
}

export const platformWrites: PluralEntityWrites = {
  isSingular: false,
  entityType: ENTITY_TYPE,
  WRITABLE_FIELDS,
  getCurrentValue,
  updateField,
  create,
}
