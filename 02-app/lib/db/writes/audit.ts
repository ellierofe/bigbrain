import { db } from '@/lib/db'
import { entityWrites } from '@/lib/db/schema/audit'
import type { WriteEntityType, WriteOp } from './types'

/**
 * Append one row to the audit log. Best-effort: failures are logged but do
 * not throw — the entity write has already succeeded. Atomic transactions
 * are not used here because the Neon HTTP driver does not support them; for
 * a single-user app, the risk of a missing audit row from a transient
 * insert failure is acceptable in v1.
 */
export async function logEntityWrite(params: {
  brandId: string
  entityType: WriteEntityType
  entityId: string
  op: WriteOp
  field: string | null
  before: unknown
  after: unknown
  actor: string
}) {
  try {
    await db.insert(entityWrites).values({
      brandId: params.brandId,
      entityType: params.entityType,
      entityId: params.entityId,
      op: params.op,
      field: params.field,
      before: params.before === undefined ? null : (params.before as object | null),
      after: params.after as object,
      actor: params.actor,
    })
  } catch (err) {
    console.error('[writes/audit] failed to log entity write', {
      params,
      err: err instanceof Error ? err.message : err,
    })
  }
}
