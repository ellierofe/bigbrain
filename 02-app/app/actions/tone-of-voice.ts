'use server'

import { revalidatePath } from 'next/cache'
import {
  getToneOfVoice,
  getDraftToneOfVoice,
  getActiveToneOfVoice,
  updateToneOfVoiceField,
  createToneOfVoiceRecord,
  deleteToneOfVoiceRecord,
  promoteDraftToActive,
  listSamples,
  createSample,
  updateSampleField,
  archiveSample,
  listApplications,
  createApplication,
  updateApplicationField,
  archiveApplication,
  restoreApplication,
} from '@/lib/db/queries/tone-of-voice'
import { getSourcesByIds } from '@/lib/db/queries/sources'
import { generateToneOfVoiceFromSamples } from '@/lib/generation/tone-of-voice'
import type { TovDimensionDeltas } from '@/lib/types/tone-of-voice'

/** Hardcoded brand ID for single-user app. Replaced with session lookup once INF-05 is live. */
const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

type ActionResult = { ok: true } | { ok: false; error: string }

const TOV_PATH = '/dna/tone-of-voice'

// ---------------------------------------------------------------------------
// Base ToV record — field-level autosave
// ---------------------------------------------------------------------------

const TEXT_FIELDS = new Set([
  'summary', 'linguisticNotes', 'emotionalResonance', 'language', 'grammaticalPerson',
])

export async function saveTovField(
  field: string,
  value: string | null
): Promise<ActionResult> {
  if (!TEXT_FIELDS.has(field)) {
    return { ok: false, error: `Field '${field}' is not editable.` }
  }

  try {
    const existing = await getToneOfVoice(BRAND_ID)
    if (!existing) {
      return { ok: false, error: 'No tone of voice record found. Generate one first.' }
    }

    await updateToneOfVoiceField(existing.id, field as any, value)
    revalidatePath(TOV_PATH)
    return { ok: true }
  } catch (err) {
    console.error('saveTovField error', err)
    return { ok: false, error: 'Save failed. Please try again.' }
  }
}

export async function saveTovDimensions(
  dimensions: Record<string, { score: number; description: string }>
): Promise<ActionResult> {
  try {
    const existing = await getToneOfVoice(BRAND_ID)
    if (!existing) {
      return { ok: false, error: 'No tone of voice record found. Generate one first.' }
    }

    await updateToneOfVoiceField(existing.id, 'dimensions' as any, dimensions)
    revalidatePath(TOV_PATH)
    return { ok: true }
  } catch (err) {
    console.error('saveTovDimensions error', err)
    return { ok: false, error: 'Save failed. Please try again.' }
  }
}

export async function saveTovVocabulary(
  vocabulary: { entries: Array<{ use: string; avoid: string; notes: string }>; overview: string }
): Promise<ActionResult> {
  try {
    const existing = await getToneOfVoice(BRAND_ID)
    if (!existing) {
      return { ok: false, error: 'No tone of voice record found. Generate one first.' }
    }

    await updateToneOfVoiceField(existing.id, 'brandVocabulary' as any, vocabulary)
    revalidatePath(TOV_PATH)
    return { ok: true }
  } catch (err) {
    console.error('saveTovVocabulary error', err)
    return { ok: false, error: 'Save failed. Please try again.' }
  }
}

export async function saveTovStatus(
  status: 'draft' | 'active' | 'archived'
): Promise<ActionResult> {
  try {
    const existing = await getToneOfVoice(BRAND_ID)
    if (!existing) {
      return { ok: false, error: 'No tone of voice record found.' }
    }

    await updateToneOfVoiceField(existing.id, 'status' as any, status)
    revalidatePath(TOV_PATH)
    return { ok: true }
  } catch (err) {
    console.error('saveTovStatus error', err)
    return { ok: false, error: 'Save failed. Please try again.' }
  }
}

// ---------------------------------------------------------------------------
// Writing samples
// ---------------------------------------------------------------------------

export async function addSample(data: {
  formatType: string
  subtype?: string
  body: string
  notes?: string
  sourceContext?: string
}): Promise<ActionResult & { data?: string }> {
  try {
    const id = await createSample(BRAND_ID, data)
    revalidatePath(TOV_PATH)
    return { ok: true, data: id }
  } catch (err) {
    console.error('addSample error', err)
    return { ok: false, error: 'Failed to add sample.' }
  }
}

export async function saveSampleField(
  id: string,
  field: string,
  value: string | null
): Promise<ActionResult> {
  try {
    await updateSampleField(id, field as any, value)
    revalidatePath(TOV_PATH)
    return { ok: true }
  } catch (err) {
    console.error('saveSampleField error', err)
    return { ok: false, error: 'Save failed. Please try again.' }
  }
}

export async function removeSample(id: string): Promise<ActionResult> {
  try {
    await archiveSample(id)
    revalidatePath(TOV_PATH)
    return { ok: true }
  } catch (err) {
    console.error('removeSample error', err)
    return { ok: false, error: 'Failed to remove sample.' }
  }
}

// ---------------------------------------------------------------------------
// Application deltas
// ---------------------------------------------------------------------------

const APPLICATION_TEXT_FIELDS = new Set([
  'label', 'formatType', 'subtype', 'notes', 'structuralGuidance',
])

export async function addApplication(data: {
  label: string
  formatType: string
  subtype?: string | null
}): Promise<ActionResult & { data?: string }> {
  try {
    const id = await createApplication(BRAND_ID, data)
    revalidatePath(TOV_PATH)
    return { ok: true, data: id }
  } catch (err) {
    console.error('addApplication error', err)
    return { ok: false, error: 'Failed to create application.' }
  }
}

export async function saveApplicationField(
  id: string,
  field: string,
  value: string | null
): Promise<ActionResult> {
  if (!APPLICATION_TEXT_FIELDS.has(field)) {
    return { ok: false, error: `Field '${field}' is not editable.` }
  }

  try {
    await updateApplicationField(id, field as any, value)
    revalidatePath(TOV_PATH)
    return { ok: true }
  } catch (err) {
    console.error('saveApplicationField error', err)
    return { ok: false, error: 'Save failed. Please try again.' }
  }
}

export async function saveApplicationDeltas(
  id: string,
  deltas: TovDimensionDeltas
): Promise<ActionResult> {
  try {
    await updateApplicationField(id, 'dimensionDeltas' as any, deltas)
    revalidatePath(TOV_PATH)
    return { ok: true }
  } catch (err) {
    console.error('saveApplicationDeltas error', err)
    return { ok: false, error: 'Save failed. Please try again.' }
  }
}

export async function saveApplicationDoNotUse(
  id: string,
  values: string[]
): Promise<ActionResult> {
  try {
    await updateApplicationField(id, 'doNotUse' as any, values)
    revalidatePath(TOV_PATH)
    return { ok: true }
  } catch (err) {
    console.error('saveApplicationDoNotUse error', err)
    return { ok: false, error: 'Save failed. Please try again.' }
  }
}

export async function archiveApplicationAction(id: string): Promise<ActionResult> {
  try {
    await archiveApplication(id)
    revalidatePath(TOV_PATH)
    return { ok: true }
  } catch (err) {
    console.error('archiveApplicationAction error', err)
    return { ok: false, error: 'Failed to archive application.' }
  }
}

export async function restoreApplicationAction(id: string): Promise<ActionResult> {
  try {
    await restoreApplication(id)
    revalidatePath(TOV_PATH)
    return { ok: true }
  } catch (err) {
    console.error('restoreApplicationAction error', err)
    return { ok: false, error: 'Failed to restore application.' }
  }
}

// ---------------------------------------------------------------------------
// Bulk sample creation from source documents
// ---------------------------------------------------------------------------

export async function addSamplesFromSources(
  picks: Array<{
    sourceDocId: string
    formatType: string
    subtype?: string | null
  }>
): Promise<ActionResult & { data?: { created: number } }> {
  if (picks.length === 0) {
    return { ok: false, error: 'No sources selected.' }
  }

  try {
    const ids = picks.map((p) => p.sourceDocId)
    const sources = await getSourcesByIds(ids)
    const sourceById = new Map(sources.map((s) => [s.id, s]))

    let created = 0
    for (const pick of picks) {
      const source = sourceById.get(pick.sourceDocId)
      if (!source) continue
      const body = source.extractedText?.trim()
      if (!body) continue // skip sources with no extracted text

      await createSample(BRAND_ID, {
        formatType: pick.formatType,
        subtype: pick.subtype?.trim() || undefined,
        body,
        sourceContext: source.title ?? undefined,
      })
      created++
    }

    if (created === 0) {
      return {
        ok: false,
        error: 'None of the selected sources had extracted text yet. Try sources that have finished processing.',
      }
    }

    revalidatePath(TOV_PATH)
    return { ok: true, data: { created } }
  } catch (err) {
    console.error('addSamplesFromSources error', err)
    return { ok: false, error: 'Failed to add samples from sources.' }
  }
}

// ---------------------------------------------------------------------------
// Regeneration: draft → review → approve / discard
// ---------------------------------------------------------------------------

export async function regenerateToneOfVoice(): Promise<ActionResult> {
  try {
    // If a draft already exists, discard it before generating a new one —
    // the user may have started over without explicitly discarding.
    const existingDraft = await getDraftToneOfVoice(BRAND_ID)
    if (existingDraft) {
      await deleteToneOfVoiceRecord(existingDraft.id)
    }

    const generated = await generateToneOfVoiceFromSamples(BRAND_ID)

    await createToneOfVoiceRecord({
      brandId: BRAND_ID,
      language: generated.language,
      grammaticalPerson: generated.grammaticalPerson,
      dimensions: generated.dimensions,
      summary: generated.summary,
      linguisticNotes: generated.linguisticNotes,
      emotionalResonance: generated.emotionalResonance,
      brandVocabulary: generated.brandVocabulary,
      generatedFromSamplesAt: new Date(),
      status: 'draft',
    })

    revalidatePath(TOV_PATH)
    return { ok: true }
  } catch (err) {
    console.error('regenerateToneOfVoice error', err)
    const msg = err instanceof Error ? err.message : 'Regeneration failed.'
    return { ok: false, error: msg }
  }
}

export async function approveDraftToneOfVoice(): Promise<ActionResult> {
  try {
    const draft = await getDraftToneOfVoice(BRAND_ID)
    if (!draft) {
      return { ok: false, error: 'No draft to approve.' }
    }
    await promoteDraftToActive(BRAND_ID, draft.id)
    revalidatePath(TOV_PATH)
    return { ok: true }
  } catch (err) {
    console.error('approveDraftToneOfVoice error', err)
    return { ok: false, error: 'Failed to approve draft.' }
  }
}

export async function discardDraftToneOfVoice(): Promise<ActionResult> {
  try {
    const draft = await getDraftToneOfVoice(BRAND_ID)
    if (!draft) {
      return { ok: false, error: 'No draft to discard.' }
    }
    await deleteToneOfVoiceRecord(draft.id)
    revalidatePath(TOV_PATH)
    return { ok: true }
  } catch (err) {
    console.error('discardDraftToneOfVoice error', err)
    return { ok: false, error: 'Failed to discard draft.' }
  }
}

// ---------------------------------------------------------------------------
// Data loaders (for use in server components)
// ---------------------------------------------------------------------------

export async function loadTovData() {
  const [tov, draft, active, samples, applications] = await Promise.all([
    getToneOfVoice(BRAND_ID),
    getDraftToneOfVoice(BRAND_ID),
    getActiveToneOfVoice(BRAND_ID),
    listSamples(BRAND_ID),
    listApplications(BRAND_ID, { includeArchived: true }),
  ])
  return { tov, draft, active, samples, applications }
}
