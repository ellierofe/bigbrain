import { eq, and, count, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { pendingInputs } from '@/lib/db/schema/inputs/pending-inputs'
import { srcSourceDocuments } from '@/lib/db/schema/source'
import { graphNodes } from '@/lib/db/schema/graph'

/** Count of pending items in the input queue for a brand */
export async function getPendingInputsCount(brandId: string): Promise<number> {
  const result = await db
    .select({ value: count() })
    .from(pendingInputs)
    .where(and(eq(pendingInputs.brandId, brandId), eq(pendingInputs.status, 'pending')))
  return result[0]?.value ?? 0
}

/** 3 most recent pending inputs for the dashboard home queue panel */
export async function getRecentPendingInputs(brandId: string) {
  return db
    .select({
      id: pendingInputs.id,
      title: pendingInputs.title,
      inputDate: pendingInputs.inputDate,
      sourceType: pendingInputs.sourceType,
      status: pendingInputs.status,
      createdAt: pendingInputs.createdAt,
    })
    .from(pendingInputs)
    .where(and(eq(pendingInputs.brandId, brandId), eq(pendingInputs.status, 'pending')))
    .orderBy(desc(pendingInputs.createdAt))
    .limit(3)
}

/** All pending inputs for the queue page */
export async function getAllPendingInputs(brandId: string) {
  return db
    .select({
      id: pendingInputs.id,
      title: pendingInputs.title,
      inputDate: pendingInputs.inputDate,
      sourceType: pendingInputs.sourceType,
      tags: pendingInputs.tags,
      extractionResult: pendingInputs.extractionResult,
      status: pendingInputs.status,
      createdAt: pendingInputs.createdAt,
    })
    .from(pendingInputs)
    .where(and(eq(pendingInputs.brandId, brandId), eq(pendingInputs.status, 'pending')))
    .orderBy(desc(pendingInputs.createdAt))
}

/** Total source documents committed for a brand */
export async function getSourceCount(brandId: string): Promise<number> {
  const result = await db
    .select({ value: count() })
    .from(srcSourceDocuments)
    .where(eq(srcSourceDocuments.brandId, brandId))
  return result[0]?.value ?? 0
}

/** Total graph nodes for a brand (excludes seed nodes with no brandId match — counts all) */
export async function getGraphNodeCount(): Promise<number> {
  const result = await db.select({ value: count() }).from(graphNodes)
  return result[0]?.value ?? 0
}

/** 10 most recent items across pending inputs and committed source documents */
export async function getRecentActivity(brandId: string) {
  const [recentPending, recentSources] = await Promise.all([
    db
      .select({
        id: pendingInputs.id,
        title: pendingInputs.title,
        type: pendingInputs.sourceType,
        createdAt: pendingInputs.createdAt,
      })
      .from(pendingInputs)
      .where(eq(pendingInputs.brandId, brandId))
      .orderBy(desc(pendingInputs.createdAt))
      .limit(10),

    db
      .select({
        id: srcSourceDocuments.id,
        title: srcSourceDocuments.title,
        type: srcSourceDocuments.sourceType,
        createdAt: srcSourceDocuments.createdAt,
      })
      .from(srcSourceDocuments)
      .where(eq(srcSourceDocuments.brandId, brandId))
      .orderBy(desc(srcSourceDocuments.createdAt))
      .limit(10),
  ])

  // Merge, tag with layer, sort by date, take top 10
  return [
    ...recentPending.map((r) => ({ ...r, layer: 'input' as const })),
    ...recentSources.map((r) => ({ ...r, layer: 'source' as const })),
  ]
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return bTime - aTime
    })
    .slice(0, 10)
}
