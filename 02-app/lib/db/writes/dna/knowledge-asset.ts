import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { dnaKnowledgeAssets } from '@/lib/db/schema/dna/knowledge-assets'
import { logEntityWrite } from '../audit'
import type { PluralEntityWrites, WriteContext, WriteResult } from '../types'

const ENTITY_TYPE = 'dna_knowledge_asset' as const
const REVALIDATE_PATHS = ['/dna/knowledge-assets'] as const

export const WRITABLE_FIELDS = new Set([
  'name',
  'kind',
  'proprietary',
  'status',
  'summary',
  'principles',
  'origin',
  'keyComponents',
  'flow',
  'objectives',
  'problemsSolved',
  'contexts',
  'priorKnowledge',
  'resources',
  'targetAudienceIds',
  'relatedOfferIds',
  'detail',
  'visualPrompt',
  'faqs',
  'vocMapping',
])

async function getRow(id: string) {
  const rows = await db.select().from(dnaKnowledgeAssets).where(eq(dnaKnowledgeAssets.id, id)).limit(1)
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
    return { ok: false, error: `Field '${field}' is not editable on knowledge asset.`, code: 'field_not_writable' }
  }

  try {
    const existing = await getRow(id)
    if (!existing) {
      return { ok: false, error: `Knowledge asset ${id} not found.`, code: 'not_found' }
    }
    const before = (existing as Record<string, unknown>)[field]

    await db
      .update(dnaKnowledgeAssets)
      .set({ [field]: value, updatedAt: new Date() })
      .where(eq(dnaKnowledgeAssets.id, id))

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

    return { ok: true, data: undefined, pathsToRevalidate: [...REVALIDATE_PATHS, `/dna/knowledge-assets/${id}`] }
  } catch (err) {
    console.error('[writes] knowledge-asset updateField failed', err)
    return { ok: false, error: 'Save failed. Please try again.', code: 'internal' }
  }
}

async function create(
  payload: Record<string, unknown>,
  ctx: WriteContext
): Promise<WriteResult<{ id: string }>> {
  try {
    const name = payload.name as string | undefined
    const kind = payload.kind as string | undefined

    if (!name || !kind) {
      return {
        ok: false,
        error: 'Knowledge asset requires name and kind.',
        code: 'validation',
      }
    }

    const rows = await db
      .insert(dnaKnowledgeAssets)
      .values({
        brandId: ctx.brandId,
        name,
        kind,
        proprietary: (payload.proprietary as boolean | undefined) ?? true,
        status: 'active',
        summary: (payload.summary as string | undefined) ?? null,
        principles: (payload.principles as string | undefined) ?? null,
        origin: (payload.origin as string | undefined) ?? null,
        keyComponents: (payload.keyComponents as unknown[] | undefined) ?? [],
        flow: (payload.flow as unknown[] | undefined) ?? [],
        objectives: (payload.objectives as string | undefined) ?? null,
        problemsSolved: (payload.problemsSolved as string | undefined) ?? null,
        contexts: (payload.contexts as string | undefined) ?? null,
      })
      .returning({ id: dnaKnowledgeAssets.id })

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
    console.error('[writes] knowledge-asset create failed', err)
    return { ok: false, error: 'Create failed. Please try again.', code: 'internal' }
  }
}

export const knowledgeAssetWrites: PluralEntityWrites = {
  isSingular: false,
  entityType: ENTITY_TYPE,
  WRITABLE_FIELDS,
  getCurrentValue,
  updateField,
  create,
}
