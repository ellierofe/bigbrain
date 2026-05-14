import { inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { processingRuns } from '@/lib/db/schema/inputs/processing-runs'
import { srcSourceDocuments } from '@/lib/db/schema/source'
import {
  LensNotApplicableError,
  NON_LENSABLE_SOURCE_TYPES,
  type LensId,
  type SourceType,
} from '@/lib/types/lens'

// ---------------------------------------------------------------------------
// Minimal lens-run dispatcher for INP-12 Pass 1.
// Creates a processing_runs row with status='pending'. Phase 3 wires the
// actual LLM dispatch + result population. For now the Pass 1 lens picker
// uses this to land a row and navigate to /inputs/results?run=<id>.
// ---------------------------------------------------------------------------

export interface CreateLensRunInput {
  brandId: string
  sourceIds: string[]
  lens: LensId
  lensInput?: string | null
}

export async function createLensRun(input: CreateLensRunInput): Promise<{ id: string }> {
  const { brandId, sourceIds, lens, lensInput } = input
  if (sourceIds.length === 0) throw new Error('createLensRun: sourceIds is empty')

  // Per ADR-009: dataset sources bypass the lens path. Raise loud if any picked
  // source is non-lensable.
  const picked = await db
    .select({ id: srcSourceDocuments.id, sourceType: srcSourceDocuments.sourceType })
    .from(srcSourceDocuments)
    .where(inArray(srcSourceDocuments.id, sourceIds))

  const offending = picked.find((s) =>
    (NON_LENSABLE_SOURCE_TYPES as readonly SourceType[]).includes(s.sourceType as SourceType),
  )
  if (offending) {
    throw new LensNotApplicableError(offending.sourceType as SourceType, lens)
  }

  const rows = await db
    .insert(processingRuns)
    .values({
      brandId,
      lens,
      sourceIds,
      lensInput: lensInput ?? null,
      status: 'pending',
    })
    .returning({ id: processingRuns.id })

  return { id: rows[0].id }
}
