import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { ideas } from '@/lib/db/schema/inputs/ideas'
import { logEntityWrite } from './audit'
import type { PluralEntityWrites, WriteContext, WriteResult } from './types'

const ENTITY_TYPE = 'idea' as const
const REVALIDATE_PATHS = ['/dashboard'] as const

export const WRITABLE_FIELDS = new Set([
  'text',
  'type',
  'status',
  'contextPage',
])

async function getRow(id: string) {
  const rows = await db.select().from(ideas).where(eq(ideas.id, id)).limit(1)
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
    return { ok: false, error: `Field '${field}' is not editable on idea.`, code: 'field_not_writable' }
  }

  try {
    const existing = await getRow(id)
    if (!existing) {
      return { ok: false, error: `Idea ${id} not found.`, code: 'not_found' }
    }
    const before = (existing as Record<string, unknown>)[field]

    await db
      .update(ideas)
      .set({ [field]: value, updatedAt: new Date() })
      .where(eq(ideas.id, id))

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

    return { ok: true, data: undefined, pathsToRevalidate: [...REVALIDATE_PATHS] }
  } catch (err) {
    console.error('[writes] idea updateField failed', err)
    return { ok: false, error: 'Save failed. Please try again.', code: 'internal' }
  }
}

async function create(
  payload: Record<string, unknown>,
  ctx: WriteContext
): Promise<WriteResult<{ id: string }>> {
  try {
    const text = payload.text as string | undefined
    if (!text || !text.trim()) {
      return { ok: false, error: 'Idea text is required.', code: 'validation' }
    }

    const rows = await db
      .insert(ideas)
      .values({
        brandId: ctx.brandId,
        text: text.trim(),
        type: (payload.type as string | undefined) ?? 'idea',
        status: 'captured',
        source: 'manual',
        contextPage: (payload.contextPage as string | undefined) ?? null,
      })
      .returning({ id: ideas.id })

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
    console.error('[writes] idea create failed', err)
    return { ok: false, error: 'Create failed. Please try again.', code: 'internal' }
  }
}

export const ideaWrites: PluralEntityWrites = {
  isSingular: false,
  entityType: ENTITY_TYPE,
  WRITABLE_FIELDS,
  getCurrentValue,
  updateField,
  create,
}
