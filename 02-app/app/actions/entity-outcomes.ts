'use server'

import { revalidatePath } from 'next/cache'
import {
  addOutcome,
  updateOutcome,
  deleteOutcome,
  type EntityOutcomeKind,
} from '@/lib/db/queries/entity-outcomes'

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string }

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export async function addEntityOutcome(data: {
  knowledgeAssetId?: string
  offerId?: string
  kind: EntityOutcomeKind
  body: string
  question?: string
  faqType?: string
  objectionAddressed?: string
  valueStatement?: string
  category?: string
}): Promise<ActionResult<{ id: string }>> {
  try {
    const id = await addOutcome({ ...data, brandId: BRAND_ID })

    if (data.knowledgeAssetId) {
      revalidatePath('/dna/knowledge-assets', 'layout')
    }
    if (data.offerId) {
      revalidatePath('/dna/offers', 'layout')
    }

    return { ok: true, data: { id } }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Add failed' }
  }
}

export async function updateEntityOutcome(
  id: string,
  data: Partial<{
    body: string
    question: string
    faqType: string
    objectionAddressed: string
    valueStatement: string
    category: string
    sortOrder: number
  }>
): Promise<ActionResult> {
  try {
    await updateOutcome(id, data)
    // Revalidate both paths since we don't know which parent type
    revalidatePath('/dna/knowledge-assets', 'layout')
    revalidatePath('/dna/offers', 'layout')
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' }
  }
}

export async function deleteEntityOutcome(
  id: string
): Promise<ActionResult> {
  try {
    await deleteOutcome(id)
    revalidatePath('/dna/knowledge-assets', 'layout')
    revalidatePath('/dna/offers', 'layout')
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' }
  }
}
