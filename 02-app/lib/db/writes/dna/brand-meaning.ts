import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { dnaBrandMeaning } from '@/lib/db/schema/dna/brand-meaning'
import { logEntityWrite } from '../audit'
import type { SingularEntityWrites, WriteContext, WriteResult } from '../types'

const ENTITY_TYPE = 'dna_brand_meaning' as const
const REVALIDATE_PATHS = ['/dna/brand-meaning'] as const

export const WRITABLE_FIELDS = new Set([
  'vision',
  'visionNotes',
  'mission',
  'missionNotes',
  'purpose',
  'purposeNotes',
  /** Structured array of { name, description, behaviours[] } */
  'values',
])

async function getRow(brandId: string) {
  const rows = await db
    .select()
    .from(dnaBrandMeaning)
    .where(eq(dnaBrandMeaning.brandId, brandId))
    .limit(1)
  return rows[0] ?? null
}

async function getCurrentValue(brandId: string, field: string): Promise<unknown> {
  if (!WRITABLE_FIELDS.has(field)) return null
  const row = await getRow(brandId)
  if (!row) return null
  return (row as Record<string, unknown>)[field] ?? null
}

async function getCurrentRowId(brandId: string): Promise<string | null> {
  const row = await getRow(brandId)
  return row?.id ?? null
}

async function updateField(
  field: string,
  value: unknown,
  ctx: WriteContext
): Promise<WriteResult> {
  if (!WRITABLE_FIELDS.has(field)) {
    return { ok: false, error: `Field '${field}' is not editable on brand meaning.`, code: 'field_not_writable' }
  }

  try {
    const existing = await getRow(ctx.brandId)
    const before = existing ? (existing as Record<string, unknown>)[field] : null
    let entityId: string

    if (existing) {
      await db
        .update(dnaBrandMeaning)
        .set({
          [field]: value,
          version: existing.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(dnaBrandMeaning.id, existing.id))
      entityId = existing.id
    } else {
      const rows = await db
        .insert(dnaBrandMeaning)
        .values({
          brandId: ctx.brandId,
          [field]: value,
        })
        .returning({ id: dnaBrandMeaning.id })
      entityId = rows[0].id
    }

    await logEntityWrite({
      brandId: ctx.brandId,
      entityType: ENTITY_TYPE,
      entityId,
      op: 'update',
      field,
      before,
      after: value,
      actor: ctx.actor,
    })

    return { ok: true, data: undefined, pathsToRevalidate: [...REVALIDATE_PATHS] }
  } catch (err) {
    console.error('[writes] brand-meaning updateField failed', err)
    return { ok: false, error: 'Save failed. Please try again.', code: 'internal' }
  }
}

export const brandMeaningWrites: SingularEntityWrites = {
  isSingular: true,
  entityType: ENTITY_TYPE,
  WRITABLE_FIELDS,
  getCurrentValue,
  getCurrentRowId,
  updateField,
}
