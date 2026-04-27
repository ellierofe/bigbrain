import { eq, and, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { processingRuns, type NewProcessingRun, type ProcessingRun } from '@/lib/db/schema/inputs/processing-runs'

/** Create a new processing run */
export async function createProcessingRun(data: NewProcessingRun): Promise<ProcessingRun> {
  const [run] = await db.insert(processingRuns).values(data).returning()
  return run
}

/** Get all pending processing runs for a brand */
export async function getPendingRuns(brandId: string): Promise<ProcessingRun[]> {
  return db
    .select()
    .from(processingRuns)
    .where(and(eq(processingRuns.brandId, brandId), eq(processingRuns.status, 'pending')))
    .orderBy(desc(processingRuns.createdAt))
}

/** Get all processing runs for a brand (pending first, then recent completed) */
export async function getAllRuns(brandId: string): Promise<ProcessingRun[]> {
  return db
    .select()
    .from(processingRuns)
    .where(eq(processingRuns.brandId, brandId))
    .orderBy(desc(processingRuns.createdAt))
}

/** Get a single processing run by ID */
export async function getRunById(id: string): Promise<ProcessingRun | null> {
  const [run] = await db
    .select()
    .from(processingRuns)
    .where(eq(processingRuns.id, id))
    .limit(1)
  return run ?? null
}

/** Update a processing run's status */
export async function updateRunStatus(id: string, status: 'committed' | 'skipped') {
  await db
    .update(processingRuns)
    .set({
      status,
      committedAt: status === 'committed' ? new Date() : null,
    })
    .where(eq(processingRuns.id, id))
}
