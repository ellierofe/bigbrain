import { and, asc, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { pendingWrites } from '@/lib/db/schema/audit'
import type { NewPendingWrite, PendingWrite } from '@/lib/db/schema/audit'

/** All pending rows for a conversation, oldest first. UI flips to newest-first when rendering. */
export async function listPendingByConversation(conversationId: string): Promise<PendingWrite[]> {
  return db
    .select()
    .from(pendingWrites)
    .where(
      and(
        eq(pendingWrites.conversationId, conversationId),
        eq(pendingWrites.status, 'pending')
      )
    )
    .orderBy(asc(pendingWrites.createdAt))
}

export async function listPendingByConversations(
  conversationIds: string[]
): Promise<PendingWrite[]> {
  if (conversationIds.length === 0) return []
  return db
    .select()
    .from(pendingWrites)
    .where(
      and(
        inArray(pendingWrites.conversationId, conversationIds),
        eq(pendingWrites.status, 'pending')
      )
    )
}

export async function getPendingWrite(id: string): Promise<PendingWrite | null> {
  const rows = await db.select().from(pendingWrites).where(eq(pendingWrites.id, id)).limit(1)
  return rows[0] ?? null
}

export async function insertPendingWrite(payload: NewPendingWrite): Promise<PendingWrite> {
  const rows = await db.insert(pendingWrites).values(payload).returning()
  return rows[0]
}

export async function markPendingWriteStatus(
  id: string,
  status: 'confirmed' | 'rejected'
): Promise<void> {
  await db
    .update(pendingWrites)
    .set({ status, decidedAt: new Date() })
    .where(eq(pendingWrites.id, id))
}
