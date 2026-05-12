import type { PendingWrite } from '@/lib/db/schema/audit'
import type { PendingWriteSummary } from './types'
import type { WriteEntityType } from '@/lib/db/writes/types'

/**
 * Project a PendingWrite DB row into the client-safe summary shape used by
 * the pending-writes pane tab. Server-side; called from the chat page when
 * hydrating ConversationCtx.
 */
export function toPendingWriteSummary(row: PendingWrite): PendingWriteSummary {
  const op = row.op as 'update' | 'create' | 'generate'
  const payload = row.payload as Record<string, unknown>

  if (op === 'update') {
    return {
      id: row.id,
      entityType: row.entityType as WriteEntityType,
      op,
      payload: {
        op: 'update',
        field: String(payload.field ?? ''),
        before: payload.before,
        after: payload.after,
      },
    }
  }
  if (op === 'create') {
    const fields = Array.isArray(payload.fields)
      ? (payload.fields as { label: string; value: unknown }[])
      : []
    return {
      id: row.id,
      entityType: row.entityType as WriteEntityType,
      op,
      payload: { op: 'create', fields },
    }
  }
  return {
    id: row.id,
    entityType: row.entityType as WriteEntityType,
    op: 'generate',
    payload: { op: 'generate', seedSummary: String(payload.seedSummary ?? '') },
  }
}
