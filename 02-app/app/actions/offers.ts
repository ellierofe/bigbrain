'use server'

import { revalidatePath } from 'next/cache'
import {
  updateOfferField,
  updateOfferJsonField,
  createOffer,
  countActiveOffers,
  getOfferDependents,
  archiveOffer,
  activateOffer,
  findNextOffer,
} from '@/lib/db/queries/offers'
import type { CreateOfferInput } from '@/lib/types/offers'

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string }

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

function revalidateOffers() {
  revalidatePath('/dna/offers', 'layout')
}

// ---------------------------------------------------------------------------
// Field autosave
// ---------------------------------------------------------------------------

export async function saveOfferField(
  id: string,
  field: string,
  value: string
): Promise<ActionResult> {
  try {
    await updateOfferField(id, field, value)
    revalidateOffers()
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Save failed' }
  }
}

export async function saveOfferJsonField(
  id: string,
  field: string,
  value: unknown
): Promise<ActionResult> {
  try {
    await updateOfferJsonField(id, field, value)
    revalidateOffers()
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Save failed' }
  }
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createNewOffer(
  input: CreateOfferInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const id = await createOffer(BRAND_ID, {
      name: input.name,
      offerType: input.offerType,
      status: input.status ?? 'draft',
      targetAudienceIds: input.targetAudienceIds,
      vocMapping: input.vocMapping,
    })
    revalidateOffers()
    return { ok: true, data: { id } }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Create failed' }
  }
}

// ---------------------------------------------------------------------------
// Archive / activate
// ---------------------------------------------------------------------------

export async function checkOfferDependents(
  offerId: string
): Promise<ActionResult<{ dependents: { name: string; type: string }[] }>> {
  try {
    const dependents = await getOfferDependents(offerId)
    return { ok: true, data: { dependents } }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Check failed' }
  }
}

export async function archiveOfferAction(
  offerId: string
): Promise<ActionResult<{ redirectTo: string | null }>> {
  try {
    // Get brand ID from offer before archiving
    await archiveOffer(offerId)
    const nextId = await findNextOffer(BRAND_ID, offerId)
    revalidateOffers()
    return { ok: true, data: { redirectTo: nextId ? `/dna/offers/${nextId}` : null } }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Archive failed' }
  }
}

export async function activateOfferAction(
  offerId: string
): Promise<ActionResult> {
  try {
    await activateOffer(offerId)
    revalidateOffers()
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Activate failed' }
  }
}

export async function countActiveOffersAction(): Promise<number> {
  return countActiveOffers(BRAND_ID)
}
