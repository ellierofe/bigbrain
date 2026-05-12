import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { dnaOffers } from '@/lib/db/schema/dna/offers'
import { logEntityWrite } from '../audit'
import type { PluralEntityWrites, WriteContext, WriteResult } from '../types'

const ENTITY_TYPE = 'dna_offer' as const
const REVALIDATE_PATHS = ['/dna/offers'] as const

/**
 * Note: no `create` operation in v1. Offer creation is multi-stage (DNA-04
 * VOC + interlocutor generation) and skill-shaped, not tool-shaped. The
 * db_update_bot brief escalates "create offer" intents to a skill rather
 * than attempting a direct create.
 */
export const WRITABLE_FIELDS = new Set([
  'name',
  'offerType',
  'status',
  'overview',
  'usp',
  'uspExplanation',
  'targetAudienceIds',
  'pricing',
  'scarcity',
  'guarantee',
  'vocMapping',
  'customerJourney',
  'salesFunnelNotes',
  'cta',
  'visualPrompt',
  'internalNotes',
])

async function getRow(id: string) {
  const rows = await db.select().from(dnaOffers).where(eq(dnaOffers.id, id)).limit(1)
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
    return { ok: false, error: `Field '${field}' is not editable on offer.`, code: 'field_not_writable' }
  }

  try {
    const existing = await getRow(id)
    if (!existing) {
      return { ok: false, error: `Offer ${id} not found.`, code: 'not_found' }
    }
    const before = (existing as Record<string, unknown>)[field]

    await db
      .update(dnaOffers)
      .set({ [field]: value, updatedAt: new Date() })
      .where(eq(dnaOffers.id, id))

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

    return { ok: true, data: undefined, pathsToRevalidate: [...REVALIDATE_PATHS, `/dna/offers/${id}`] }
  } catch (err) {
    console.error('[writes] offer updateField failed', err)
    return { ok: false, error: 'Save failed. Please try again.', code: 'internal' }
  }
}

export const offerWrites: PluralEntityWrites = {
  isSingular: false,
  entityType: ENTITY_TYPE,
  WRITABLE_FIELDS,
  getCurrentValue,
  updateField,
  // Deliberately no create — escalate to skill.
}
