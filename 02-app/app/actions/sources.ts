'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { srcSourceDocuments } from '@/lib/db/schema/source'
import {
  updateSourceFields,
  triageSources,
  markSingleTriaged,
  deleteSource,
  searchPeople,
  parkPersonAsUnresolved,
  getChunksForSource,
  getSourceDetail,
  type SourceFieldPatch,
} from '@/lib/db/queries/sources'
import { createLensRun } from '@/lib/db/queries/lens-runs'
import { ingestSource } from '@/lib/processing/ingest/run'
import { LensNotApplicableError, type LensId, type SourceType } from '@/lib/types/lens'
import type { ChunkRowData, PersonSummary, SourceDetailData } from '@/lib/types/source-list'

// ---------------------------------------------------------------------------
// Server actions for INP-12 Pass 1 source surfaces.
// ---------------------------------------------------------------------------

/** Hardcoded brand ID for single-user app. Replaced with session lookup once INF-05 is live. */
const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

const SOURCES_PATH = '/inputs/sources'

type ActionResult = { ok: true } | { ok: false; error: string }

export async function updateSourceAction(id: string, patch: SourceFieldPatch): Promise<ActionResult> {
  try {
    await updateSourceFields(id, patch)
    revalidatePath(SOURCES_PATH)
    revalidatePath(`${SOURCES_PATH}/${id}`)
    return { ok: true }
  } catch (err) {
    console.error('[updateSourceAction]', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' }
  }
}

export async function triageSourcesAction(
  ids: string[],
  patches?: Record<string, SourceFieldPatch>,
): Promise<ActionResult> {
  try {
    await triageSources(ids, patches)
    revalidatePath(SOURCES_PATH)
    return { ok: true }
  } catch (err) {
    console.error('[triageSourcesAction]', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Triage failed' }
  }
}

export async function markSingleTriagedAction(id: string): Promise<ActionResult> {
  try {
    await markSingleTriaged(id)
    revalidatePath(SOURCES_PATH)
    revalidatePath(`${SOURCES_PATH}/${id}`)
    return { ok: true }
  } catch (err) {
    console.error('[markSingleTriagedAction]', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Mark-triaged failed' }
  }
}

export async function deleteSourceAction(id: string): Promise<ActionResult> {
  try {
    await deleteSource(id)
    revalidatePath(SOURCES_PATH)
    return { ok: true }
  } catch (err) {
    console.error('[deleteSourceAction]', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' }
  }
}

export async function searchPeopleAction(query: string): Promise<PersonSummary[]> {
  return searchPeople(query)
}

const BRAND_FOR_ACTIONS = BRAND_ID
export async function loadSourcePreviewAction(
  id: string,
): Promise<{ ok: true; source: SourceDetailData; chunks: ChunkRowData[] } | { ok: false; error: string }> {
  try {
    const source = await getSourceDetail(BRAND_FOR_ACTIONS, id)
    if (!source) return { ok: false, error: 'Source not found' }
    const chunks = await getChunksForSource(id, 5)
    return { ok: true, source, chunks }
  } catch (err) {
    console.error('[loadSourcePreviewAction]', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Preview load failed' }
  }
}

export async function parkPersonAction(
  name: string,
): Promise<{ ok: true; person: PersonSummary } | { ok: false; error: string }> {
  try {
    const parked = await parkPersonAsUnresolved(name)
    return { ok: true, person: { id: parked.id, name: parked.name } }
  } catch (err) {
    console.error('[parkPersonAction]', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Park failed' }
  }
}

export async function createSourceFromTextAction(input: {
  title: string
  sourceType: SourceType
  text: string
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const title = input.title.trim()
  const text = input.text.trim()
  if (!title) return { ok: false, error: 'Title is required' }
  if (!text) return { ok: false, error: 'Text is required' }

  try {
    const rows = await db
      .insert(srcSourceDocuments)
      .values({
        brandId: BRAND_ID,
        title,
        sourceType: input.sourceType,
        authority: 'own',
        inboxStatus: 'new',
        extractedText: text,
      })
      .returning({ id: srcSourceDocuments.id })

    const id = rows[0].id
    void ingestSource(id).catch((err) => {
      console.error(`[createSourceFromTextAction] background ingest failed for ${id}:`, err)
    })

    revalidatePath(SOURCES_PATH)
    return { ok: true, id }
  } catch (err) {
    console.error('[createSourceFromTextAction]', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Create failed' }
  }
}

export async function resummariseSourceAction(id: string): Promise<ActionResult> {
  try {
    await ingestSource(id)
    revalidatePath(`${SOURCES_PATH}/${id}`)
    return { ok: true }
  } catch (err) {
    console.error('[resummariseSourceAction]', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Re-summarise failed' }
  }
}

export async function dispatchLensRunAction(input: {
  sourceIds: string[]
  lens: LensId
  lensInput?: string
}): Promise<{ ok: true; runId: string } | { ok: false; error: string; reason?: 'not-applicable' }> {
  try {
    const { id } = await createLensRun({
      brandId: BRAND_ID,
      sourceIds: input.sourceIds,
      lens: input.lens,
      lensInput: input.lensInput ?? null,
    })
    return { ok: true, runId: id }
  } catch (err) {
    if (err instanceof LensNotApplicableError) {
      return { ok: false, error: err.message, reason: 'not-applicable' }
    }
    console.error('[dispatchLensRunAction]', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Run dispatch failed' }
  }
}
