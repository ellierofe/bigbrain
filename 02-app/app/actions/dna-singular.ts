'use server'

import { revalidatePath } from 'next/cache'
import {
  businessOverviewWrites,
  brandMeaningWrites,
  valuePropositionWrites,
  type WriteContext,
  type WriteResult,
} from '@/lib/db/writes'

/** Hardcoded brand ID for single-user app. Replaced with session lookup once INF-05 is live. */
const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

type ActionResult = { ok: true } | { ok: false; error: string }

function actionResult(result: WriteResult, paths?: string[]): ActionResult {
  for (const path of result.ok ? result.pathsToRevalidate : []) revalidatePath(path)
  for (const path of paths ?? []) revalidatePath(path)
  return result.ok ? { ok: true } : { ok: false, error: result.error }
}

// ---------------------------------------------------------------------------
// Business Overview
// ---------------------------------------------------------------------------

export async function saveBusinessOverviewField(
  field: string,
  value: string | null
): Promise<ActionResult> {
  const ctx: WriteContext = { actor: 'ui:/dna/business-overview', brandId: BRAND_ID }
  const result = await businessOverviewWrites.updateField(field, value, ctx)
  return actionResult(result)
}

export async function saveBusinessOverviewJson(
  field: 'socialHandles',
  value: Record<string, string | null>
): Promise<ActionResult> {
  const ctx: WriteContext = { actor: 'ui:/dna/business-overview', brandId: BRAND_ID }
  const result = await businessOverviewWrites.updateField(field, value, ctx)
  return actionResult(result)
}

// ---------------------------------------------------------------------------
// Brand Meaning
// ---------------------------------------------------------------------------

export async function saveBrandMeaningField(
  field: string,
  value: string | null
): Promise<ActionResult> {
  const ctx: WriteContext = { actor: 'ui:/dna/brand-meaning', brandId: BRAND_ID }
  const result = await brandMeaningWrites.updateField(field, value, ctx)
  return actionResult(result)
}

export async function saveBrandMeaningValues(
  values: Array<{ name: string; description: string; behaviours: string[] }>
): Promise<ActionResult> {
  const ctx: WriteContext = { actor: 'ui:/dna/brand-meaning', brandId: BRAND_ID }
  const result = await brandMeaningWrites.updateField('values', values, ctx)
  return actionResult(result)
}

// ---------------------------------------------------------------------------
// Value Proposition
// ---------------------------------------------------------------------------

export async function saveValuePropositionField(
  field: string,
  value: string | null
): Promise<ActionResult> {
  const ctx: WriteContext = { actor: 'ui:/dna/value-proposition', brandId: BRAND_ID }
  const result = await valuePropositionWrites.updateField(field, value, ctx)
  return actionResult(result)
}

export async function saveValuePropositionDifferentiators(
  differentiators: string[]
): Promise<ActionResult> {
  const ctx: WriteContext = { actor: 'ui:/dna/value-proposition', brandId: BRAND_ID }
  const result = await valuePropositionWrites.updateField('differentiators', differentiators, ctx)
  return actionResult(result)
}

export async function saveValuePropositionAlternatives(
  alternatives: Array<{ alternative: string; whyUs: string }>
): Promise<ActionResult> {
  const ctx: WriteContext = { actor: 'ui:/dna/value-proposition', brandId: BRAND_ID }
  const result = await valuePropositionWrites.updateField('alternativesAddressed', alternatives, ctx)
  return actionResult(result)
}
