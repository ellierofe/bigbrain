import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { dnaBusinessOverview } from '@/lib/db/schema/dna/business-overview'
import { logEntityWrite } from '../audit'
import type { SingularEntityWrites, WriteContext, WriteResult } from '../types'

const ENTITY_TYPE = 'dna_business_overview' as const
const REVALIDATE_PATHS = ['/dna/business-overview'] as const

export const WRITABLE_FIELDS = new Set([
  'businessName',
  'legalName',
  'ownerName',
  'vertical',
  'specialism',
  'businessModel',
  'foundingYear',
  'geographicFocus',
  'stage',
  'shortDescription',
  'fullDescription',
  'websiteUrl',
  'primaryEmail',
  'notes',
  /** Structured object — { linkedin, x, instagram, ... } */
  'socialHandles',
])

async function getRow(brandId: string) {
  const rows = await db
    .select()
    .from(dnaBusinessOverview)
    .where(eq(dnaBusinessOverview.brandId, brandId))
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

function coerce(field: string, value: unknown): unknown {
  if (field === 'foundingYear') {
    if (value === null || value === '' || value === undefined) return null
    if (typeof value === 'number') return value
    const parsed = parseInt(String(value), 10)
    return Number.isNaN(parsed) ? null : parsed
  }
  return value
}

async function updateField(
  field: string,
  value: unknown,
  ctx: WriteContext
): Promise<WriteResult> {
  if (!WRITABLE_FIELDS.has(field)) {
    return { ok: false, error: `Field '${field}' is not editable on business overview.`, code: 'field_not_writable' }
  }

  const coercedValue = coerce(field, value)

  try {
    const existing = await getRow(ctx.brandId)
    const before = existing ? (existing as Record<string, unknown>)[field] : null
    let entityId: string

    if (existing) {
      await db
        .update(dnaBusinessOverview)
        .set({ [field]: coercedValue, version: existing.version + 1, updatedAt: new Date() })
        .where(eq(dnaBusinessOverview.id, existing.id))
      entityId = existing.id
    } else {
      const rows = await db
        .insert(dnaBusinessOverview)
        .values({
          brandId: ctx.brandId,
          businessName: field === 'businessName' ? (coercedValue as string ?? '') : '',
          vertical: field === 'vertical' ? (coercedValue as string ?? '') : '',
          specialism: field === 'specialism' ? (coercedValue as string ?? '') : '',
          [field]: coercedValue,
        })
        .returning({ id: dnaBusinessOverview.id })
      entityId = rows[0].id
    }

    await logEntityWrite({
      brandId: ctx.brandId,
      entityType: ENTITY_TYPE,
      entityId,
      op: 'update',
      field,
      before,
      after: coercedValue,
      actor: ctx.actor,
    })

    return { ok: true, data: undefined, pathsToRevalidate: [...REVALIDATE_PATHS] }
  } catch (err) {
    console.error('[writes] business-overview updateField failed', err)
    return { ok: false, error: 'Save failed. Please try again.', code: 'internal' }
  }
}

export const businessOverviewWrites: SingularEntityWrites = {
  isSingular: true,
  entityType: ENTITY_TYPE,
  WRITABLE_FIELDS,
  getCurrentValue,
  getCurrentRowId,
  updateField,
}
