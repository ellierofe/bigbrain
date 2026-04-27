'use server'

import { revalidatePath } from 'next/cache'
import {
  getBusinessOverview,
  upsertBusinessOverview,
  updateBusinessOverviewField,
  getBrandMeaning,
  upsertBrandMeaning,
  updateBrandMeaningField,
  getValueProposition,
  upsertValueProposition,
  updateValuePropositionField,
} from '@/lib/db/queries/dna-singular'

/** Hardcoded brand ID for single-user app. Replaced with session lookup once INF-05 is live. */
const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

type ActionResult = { ok: true } | { ok: false; error: string }

// ---------------------------------------------------------------------------
// Business Overview
// ---------------------------------------------------------------------------

const BUSINESS_OVERVIEW_FIELDS = new Set([
  'businessName', 'legalName', 'ownerName', 'vertical', 'specialism',
  'businessModel', 'foundingYear', 'geographicFocus', 'stage',
  'shortDescription', 'fullDescription', 'websiteUrl', 'primaryEmail', 'notes',
])

export async function saveBusinessOverviewField(
  field: string,
  value: string | null
): Promise<ActionResult> {
  if (!BUSINESS_OVERVIEW_FIELDS.has(field)) {
    return { ok: false, error: `Field '${field}' is not editable.` }
  }

  try {
    let existing = await getBusinessOverview(BRAND_ID)

    if (!existing) {
      // Auto-create the row on first edit
      const id = await upsertBusinessOverview(BRAND_ID, {
        businessName: field === 'businessName' ? (value ?? '') : '',
        vertical: field === 'vertical' ? (value ?? '') : '',
        specialism: field === 'specialism' ? (value ?? '') : '',
        [field]: field === 'foundingYear' ? (value ? parseInt(value, 10) : null) : value,
      })
      revalidatePath('/dna/business-overview')
      return { ok: true }
    }

    const coerced = field === 'foundingYear' ? (value ? parseInt(value, 10) : null) : value
    await updateBusinessOverviewField(existing.id, field as any, coerced)
    revalidatePath('/dna/business-overview')
    return { ok: true }
  } catch (err) {
    console.error('saveBusinessOverviewField error', err)
    return { ok: false, error: 'Save failed. Please try again.' }
  }
}

export async function saveBusinessOverviewJson(
  field: 'socialHandles',
  value: Record<string, string | null>
): Promise<ActionResult> {
  try {
    let existing = await getBusinessOverview(BRAND_ID)

    if (!existing) {
      await upsertBusinessOverview(BRAND_ID, {
        businessName: '',
        vertical: '',
        specialism: '',
        [field]: value,
      })
      revalidatePath('/dna/business-overview')
      return { ok: true }
    }

    await updateBusinessOverviewField(existing.id, field as any, value)
    revalidatePath('/dna/business-overview')
    return { ok: true }
  } catch (err) {
    console.error('saveBusinessOverviewJson error', err)
    return { ok: false, error: 'Save failed. Please try again.' }
  }
}

// ---------------------------------------------------------------------------
// Brand Meaning
// ---------------------------------------------------------------------------

const BRAND_MEANING_FIELDS = new Set([
  'vision', 'visionNotes', 'mission', 'missionNotes',
  'purpose', 'purposeNotes',
])

export async function saveBrandMeaningField(
  field: string,
  value: string | null
): Promise<ActionResult> {
  if (!BRAND_MEANING_FIELDS.has(field)) {
    return { ok: false, error: `Field '${field}' is not editable.` }
  }

  try {
    let existing = await getBrandMeaning(BRAND_ID)

    if (!existing) {
      await upsertBrandMeaning(BRAND_ID, { [field]: value })
      revalidatePath('/dna/brand-meaning')
      return { ok: true }
    }

    await updateBrandMeaningField(existing.id, field as any, value)
    revalidatePath('/dna/brand-meaning')
    return { ok: true }
  } catch (err) {
    console.error('saveBrandMeaningField error', err)
    return { ok: false, error: 'Save failed. Please try again.' }
  }
}

export async function saveBrandMeaningValues(
  values: Array<{ name: string; description: string; behaviours: string[] }>
): Promise<ActionResult> {
  try {
    let existing = await getBrandMeaning(BRAND_ID)

    if (!existing) {
      await upsertBrandMeaning(BRAND_ID, { values })
      revalidatePath('/dna/brand-meaning')
      return { ok: true }
    }

    await updateBrandMeaningField(existing.id, 'values' as any, values)
    revalidatePath('/dna/brand-meaning')
    return { ok: true }
  } catch (err) {
    console.error('saveBrandMeaningValues error', err)
    return { ok: false, error: 'Save failed. Please try again.' }
  }
}

// ---------------------------------------------------------------------------
// Value Proposition
// ---------------------------------------------------------------------------

const VALUE_PROP_FIELDS = new Set([
  'coreStatement', 'targetCustomer', 'problemSolved', 'outcomeDelivered',
  'uniqueMechanism', 'elevatorPitch', 'internalNotes',
])

export async function saveValuePropositionField(
  field: string,
  value: string | null
): Promise<ActionResult> {
  if (!VALUE_PROP_FIELDS.has(field)) {
    return { ok: false, error: `Field '${field}' is not editable.` }
  }

  try {
    let existing = await getValueProposition(BRAND_ID)

    if (!existing) {
      await upsertValueProposition(BRAND_ID, { [field]: value })
      revalidatePath('/dna/value-proposition')
      return { ok: true }
    }

    await updateValuePropositionField(existing.id, field as any, value)
    revalidatePath('/dna/value-proposition')
    return { ok: true }
  } catch (err) {
    console.error('saveValuePropositionField error', err)
    return { ok: false, error: 'Save failed. Please try again.' }
  }
}

export async function saveValuePropositionDifferentiators(
  differentiators: string[]
): Promise<ActionResult> {
  try {
    let existing = await getValueProposition(BRAND_ID)

    if (!existing) {
      await upsertValueProposition(BRAND_ID, { differentiators })
      revalidatePath('/dna/value-proposition')
      return { ok: true }
    }

    await updateValuePropositionField(existing.id, 'differentiators' as any, differentiators)
    revalidatePath('/dna/value-proposition')
    return { ok: true }
  } catch (err) {
    console.error('saveValuePropositionDifferentiators error', err)
    return { ok: false, error: 'Save failed. Please try again.' }
  }
}

export async function saveValuePropositionAlternatives(
  alternatives: Array<{ alternative: string; whyUs: string }>
): Promise<ActionResult> {
  try {
    let existing = await getValueProposition(BRAND_ID)

    if (!existing) {
      await upsertValueProposition(BRAND_ID, { alternativesAddressed: alternatives })
      revalidatePath('/dna/value-proposition')
      return { ok: true }
    }

    await updateValuePropositionField(existing.id, 'alternativesAddressed' as any, alternatives)
    revalidatePath('/dna/value-proposition')
    return { ok: true }
  } catch (err) {
    console.error('saveValuePropositionAlternatives error', err)
    return { ok: false, error: 'Save failed. Please try again.' }
  }
}
