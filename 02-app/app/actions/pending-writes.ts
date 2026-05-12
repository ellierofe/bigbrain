'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { addMessage, getConversation } from '@/lib/db/queries/chat'
import {
  getPendingWrite,
  markPendingWriteStatus,
} from '@/lib/db/queries/pending-writes'
import {
  getEntityWrites,
  kickoffAudienceSegmentGeneration,
  entityWriteSummary,
  type WriteContext,
  type WriteEntityType,
  type WriteResult,
} from '@/lib/db/writes'

const isDev = process.env.NODE_ENV === 'development'

async function requireAuth() {
  if (isDev) return
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
}

export type PendingWriteActionResult =
  | { ok: true }
  | { ok: false; error: string }

interface UpdatePayload {
  field: string
  before: unknown
  after: unknown
}

interface CreatePayload {
  rawPayload: Record<string, unknown>
  fields: { label: string; value: unknown }[]
}

interface GeneratePayload {
  seedSummary: string
  seedInputs: Record<string, unknown>
}

/**
 * Confirm a pending write — execute the actual entity write, log to
 * `entity_writes`, flip pending status to 'confirmed', inject an in-chat
 * SystemMessageDivider, revalidate paths.
 */
export async function confirmPendingWriteAction(
  pendingId: string
): Promise<PendingWriteActionResult> {
  await requireAuth()

  const pending = await getPendingWrite(pendingId)
  if (!pending) return { ok: false, error: 'Pending write not found.' }
  if (pending.status !== 'pending') return { ok: false, error: 'Already decided.' }

  const conversation = await getConversation(pending.conversationId)
  if (!conversation) return { ok: false, error: 'Conversation not found.' }

  const ctx: WriteContext = {
    actor: `chat:${pending.conversationId}`,
    brandId: conversation.brandId,
  }

  const entityType = pending.entityType as WriteEntityType
  const writes = getEntityWrites(entityType)
  let result: WriteResult<unknown> = { ok: false, error: 'Unknown op.' }
  let confirmationText = ''
  let confirmationMetadata: Record<string, unknown> = {
    kind: 'write-confirmation',
    entity_type: entityType,
    op: pending.op,
  }

  try {
    if (pending.op === 'update') {
      const payload = pending.payload as UpdatePayload
      if (writes.isSingular) {
        result = await writes.updateField(payload.field, payload.after, ctx)
      } else {
        if (!pending.entityId) {
          return { ok: false, error: 'Update missing entity id.' }
        }
        result = await writes.updateField(pending.entityId, payload.field, payload.after, ctx)
      }
      confirmationText = `Saved: ${entityWriteSummary(entityType, 'update', payload.field)}`
      confirmationMetadata = { ...confirmationMetadata, field: payload.field }
    } else if (pending.op === 'create') {
      const payload = pending.payload as CreatePayload
      if (writes.isSingular) {
        return { ok: false, error: 'Singular entities cannot be created via tool.' }
      }
      if (!writes.create) {
        return { ok: false, error: `Direct create not supported for ${entityType}.` }
      }
      result = await writes.create(payload.rawPayload, ctx)
      confirmationText = `Created: ${entityWriteSummary(entityType, 'create')}`
    } else if (pending.op === 'generate') {
      const payload = pending.payload as GeneratePayload
      if (entityType === 'dna_audience_segment') {
        const r = await kickoffAudienceSegmentGeneration(
          payload.seedInputs as { roleContext: string; biggestProblem?: string; biggestDesire?: string },
          ctx
        )
        result = r
        if (r.ok) {
          confirmationText = `Created: audience segment "${r.data.segmentName}"`
          confirmationMetadata = { ...confirmationMetadata, op: 'create', via: 'generate', segmentId: r.data.id }
        }
      } else {
        return { ok: false, error: `Generation not supported for ${entityType}.` }
      }
    } else {
      return { ok: false, error: `Unknown op: ${pending.op}` }
    }

    if (!result.ok) {
      return { ok: false, error: result.error }
    }

    await markPendingWriteStatus(pendingId, 'confirmed')

    await addMessage(pending.conversationId, 'system', confirmationText, {
      metadata: confirmationMetadata,
    })

    for (const path of result.pathsToRevalidate) {
      revalidatePath(path)
    }
    revalidatePath(`/chat/${pending.conversationId}`)

    return { ok: true }
  } catch (err) {
    console.error('[confirmPendingWrite] failed', err)
    return { ok: false, error: 'Confirm failed. Please try again.' }
  }
}

/**
 * Reject a pending write — flip status to 'rejected', no DB write, no
 * in-chat divider. The runtime returns a "user rejected" tool result to the
 * main LLM on its next turn (via the conversation's pending_writes list).
 */
export async function rejectPendingWriteAction(
  pendingId: string
): Promise<PendingWriteActionResult> {
  await requireAuth()

  const pending = await getPendingWrite(pendingId)
  if (!pending) return { ok: false, error: 'Pending write not found.' }
  if (pending.status !== 'pending') return { ok: false, error: 'Already decided.' }

  try {
    await markPendingWriteStatus(pendingId, 'rejected')
    revalidatePath(`/chat/${pending.conversationId}`)
    return { ok: true }
  } catch (err) {
    console.error('[rejectPendingWrite] failed', err)
    return { ok: false, error: 'Reject failed. Please try again.' }
  }
}
