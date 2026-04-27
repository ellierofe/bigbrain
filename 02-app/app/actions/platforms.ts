'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { dnaPlatforms } from '@/lib/db/schema/dna/platforms'
import {
  getPlatformById,
  countActivePlatforms,
  getPlatformDependents,
  updatePlatformField,
  archivePlatform,
  activatePlatform,
} from '@/lib/db/queries/platforms'
import type { CreatePlatformInput } from '@/lib/types/platforms'
import { validateCategoryChannelPair } from '@/lib/types/channels'

/** Hardcoded brand ID for single-user app. Replaced with session lookup once INF-05 is live. */
const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

/** Create a new channel (Save as draft flow from the creation modal) */
export async function createPlatform(
  input: CreatePlatformInput
): Promise<ActionResult<{ id: string }>> {
  if (!validateCategoryChannelPair(input.category, input.channel)) {
    return { ok: false, error: `Invalid category/channel pair: ${input.category}/${input.channel}.` }
  }
  try {
    const rows = await db
      .insert(dnaPlatforms)
      .values({
        brandId: BRAND_ID,
        name: input.name,
        category: input.category,
        channel: input.channel,
        handle: input.handle || null,
        primaryObjective: input.primaryObjective || null,
        audience: input.audience || null,
        isActive: false, // draft — user activates manually
      })
      .returning({ id: dnaPlatforms.id })

    revalidatePath('/dna/platforms')
    return { ok: true, data: { id: rows[0].id } }
  } catch (err) {
    console.error('createPlatform error', err)
    return { ok: false, error: 'Failed to create channel. Please try again.' }
  }
}

/** Update both category + channel atomically. Used by the Change category / channel modal. */
export async function updatePlatformCategoryAndChannel(
  id: string,
  category: string,
  channel: string
): Promise<ActionResult> {
  if (!validateCategoryChannelPair(category, channel)) {
    return { ok: false, error: `Invalid category/channel pair: ${category}/${channel}.` }
  }
  try {
    await db
      .update(dnaPlatforms)
      .set({ category, channel, updatedAt: new Date() })
      .where(eq(dnaPlatforms.id, id))
    revalidatePath(`/dna/platforms/${id}`)
    revalidatePath('/dna/platforms')
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('updatePlatformCategoryAndChannel error', err)
    return { ok: false, error: 'Failed to update category / channel.' }
  }
}

/** Save all LLM-generated fields to a platform row */
export async function saveGeneratedPlatform(
  id: string,
  data: {
    primaryObjective: string
    audience: string
    contentStrategy: string
    postingFrequency: string
    customerJourneyStage: string
    growthFunction: string
    usp: string
    engagementApproach: string
    hashtagStrategy?: string
    contentFormats: unknown[]
    subtopicIdeas: unknown[]
    structureAndFeatures: unknown
    characterLimits: unknown
    doNotDo: string[]
    analyticsGoals: string
    contentPillarThemes?: string
  }
): Promise<ActionResult> {
  try {
    await db
      .update(dnaPlatforms)
      .set({
        primaryObjective: data.primaryObjective,
        audience: data.audience,
        contentStrategy: data.contentStrategy,
        postingFrequency: data.postingFrequency,
        customerJourneyStage: data.customerJourneyStage,
        growthFunction: data.growthFunction,
        usp: data.usp,
        engagementApproach: data.engagementApproach,
        hashtagStrategy: data.hashtagStrategy || null,
        contentFormats: data.contentFormats,
        subtopicIdeas: data.subtopicIdeas,
        structureAndFeatures: data.structureAndFeatures,
        characterLimits: data.characterLimits,
        doNotDo: data.doNotDo,
        analyticsGoals: data.analyticsGoals,
        contentPillarThemes: data.contentPillarThemes || null,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(dnaPlatforms.id, id))

    revalidatePath('/dna/platforms')
    revalidatePath(`/dna/platforms/${id}`)
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('saveGeneratedPlatform error', err)
    return { ok: false, error: 'Failed to save generated platform.' }
  }
}

/** Autosave a single scalar field */
export async function savePlatformField(
  id: string,
  field: string,
  value: string | null
): Promise<ActionResult> {
  const allowed = new Set([
    'name',
    'handle',
    'primaryObjective',
    'audience',
    'contentStrategy',
    'postingFrequency',
    'customerJourneyStage',
    'growthFunction',
    'usp',
    'engagementApproach',
    'hashtagStrategy',
    'contentPillarThemes',
    'analyticsGoals',
    'performanceSummary',
    'notes',
  ])
  if (!allowed.has(field)) {
    return { ok: false, error: `Field '${field}' is not directly editable via this action.` }
  }

  try {
    await updatePlatformField(
      id,
      field as keyof typeof dnaPlatforms.$inferSelect,
      value
    )
    revalidatePath(`/dna/platforms/${id}`)
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('savePlatformField error', err)
    return { ok: false, error: 'Save failed. Please try again.' }
  }
}

/** Save a JSONB or array field (contentFormats, subtopicIdeas, structureAndFeatures, characterLimits, doNotDo) */
export async function savePlatformJsonField(
  id: string,
  field: string,
  value: unknown
): Promise<ActionResult> {
  const allowed = new Set([
    'contentFormats',
    'subtopicIdeas',
    'structureAndFeatures',
    'characterLimits',
    'doNotDo',
    'sourceDocumentIds',
  ])
  if (!allowed.has(field)) {
    return { ok: false, error: `Field '${field}' is not editable via this action.` }
  }

  try {
    await updatePlatformField(
      id,
      field as keyof typeof dnaPlatforms.$inferSelect,
      value
    )
    revalidatePath(`/dna/platforms/${id}`)
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('savePlatformJsonField error', err)
    return { ok: false, error: 'Save failed. Please try again.' }
  }
}

/** Toggle isActive */
export async function togglePlatformActive(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    if (!isActive) {
      // Deactivating — check we're not archiving the last one
      const platform = await getPlatformById(id)
      if (!platform) return { ok: false, error: 'Platform not found.' }
      const activeCount = await countActivePlatforms(platform.brandId)
      if (activeCount <= 1) {
        return { ok: false, error: 'You must have at least one active platform.' }
      }
    }

    await updatePlatformField(
      id,
      'isActive' as keyof typeof dnaPlatforms.$inferSelect,
      isActive
    )
    revalidatePath(`/dna/platforms/${id}`)
    revalidatePath('/dna/platforms')
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('togglePlatformActive error', err)
    return { ok: false, error: 'Failed to update platform status.' }
  }
}

/** Archive a platform. Returns dependents if any exist. */
export async function checkAndArchivePlatform(
  id: string
): Promise<ActionResult<{ dependents: { name: string; type: string }[] }>> {
  try {
    const platform = await getPlatformById(id)
    if (!platform) return { ok: false, error: 'Platform not found.' }

    if (platform.isActive) {
      const activeCount = await countActivePlatforms(platform.brandId)
      if (activeCount <= 1) {
        return {
          ok: false,
          error: 'You must have at least one active platform.',
        }
      }
    }

    const dependents = await getPlatformDependents(id)
    return { ok: true, data: { dependents } }
  } catch (err) {
    console.error('checkAndArchivePlatform error', err)
    return { ok: false, error: 'Could not check dependents. Please try again.' }
  }
}

/** Confirm archive after user has acknowledged dependents */
export async function confirmArchivePlatform(
  id: string
): Promise<ActionResult<{ nextId: string | null }>> {
  try {
    const platform = await getPlatformById(id)
    if (!platform) return { ok: false, error: 'Platform not found.' }

    if (platform.isActive) {
      const activeCount = await countActivePlatforms(platform.brandId)
      if (activeCount <= 1) {
        return { ok: false, error: 'You must have at least one active platform.' }
      }
    }

    await archivePlatform(id)
    revalidatePath('/dna/platforms')

    const { listPlatforms } = await import('@/lib/db/queries/platforms')
    const remaining = await listPlatforms(platform.brandId)
    const nextId = remaining.length > 0 ? remaining[0].id : null

    return { ok: true, data: { nextId } }
  } catch (err) {
    console.error('confirmArchivePlatform error', err)
    return { ok: false, error: "Couldn't archive. Please try again." }
  }
}

/** Promote an inactive platform to active */
export async function markPlatformActive(id: string): Promise<ActionResult> {
  try {
    await activatePlatform(id)
    revalidatePath(`/dna/platforms/${id}`)
    revalidatePath('/dna/platforms')
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('markPlatformActive error', err)
    return { ok: false, error: 'Failed to activate platform. Please try again.' }
  }
}
