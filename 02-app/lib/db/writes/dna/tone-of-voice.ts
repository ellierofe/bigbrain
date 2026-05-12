import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { dnaToneOfVoice } from '@/lib/db/schema/dna/tone-of-voice'
import { logEntityWrite } from '../audit'
import type { SingularEntityWrites, WriteContext, WriteResult } from '../types'

const ENTITY_TYPE = 'dna_tone_of_voice' as const
const REVALIDATE_PATHS = ['/dna/tone-of-voice'] as const

export const WRITABLE_FIELDS = new Set([
  'language',
  'grammaticalPerson',
  /** Structured object — per-dimension scores + notes */
  'dimensions',
  'summary',
  'linguisticNotes',
  'emotionalResonance',
  /** Structured object — { preferredWords, avoidedWords, ... } */
  'brandVocabulary',
])

async function getRow(brandId: string) {
  const rows = await db
    .select()
    .from(dnaToneOfVoice)
    .where(eq(dnaToneOfVoice.brandId, brandId))
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
    return { ok: false, error: `Field '${field}' is not editable on tone of voice.`, code: 'field_not_writable' }
  }

  try {
    const existing = await getRow(ctx.brandId)
    const before = existing ? (existing as Record<string, unknown>)[field] : null
    let entityId: string

    if (existing) {
      await db
        .update(dnaToneOfVoice)
        .set({
          [field]: value,
          version: existing.version + 1,
          updatedAt: new Date(),
          lastEditedByHumanAt: new Date(),
        })
        .where(eq(dnaToneOfVoice.id, existing.id))
      entityId = existing.id
    } else {
      const rows = await db
        .insert(dnaToneOfVoice)
        .values({ brandId: ctx.brandId, [field]: value })
        .returning({ id: dnaToneOfVoice.id })
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
    console.error('[writes] tone-of-voice updateField failed', err)
    return { ok: false, error: 'Save failed. Please try again.', code: 'internal' }
  }
}

export const toneOfVoiceWrites: SingularEntityWrites = {
  isSingular: true,
  entityType: ENTITY_TYPE,
  WRITABLE_FIELDS,
  getCurrentValue,
  getCurrentRowId,
  updateField,
}
