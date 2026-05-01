'use server'

import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { brandContentTypeFavourites } from '@/lib/db/schema/content/brand-content-type-favourites'
import { contentTypes } from '@/lib/db/schema/content/content-types'
import { promptStages } from '@/lib/db/schema/content/prompt-stages'
import { generationRuns } from '@/lib/db/schema/content/generation-runs'
import { assemble } from '@/lib/llm/content/assemble'
import {
  listCategories,
  listChildren,
  resolveChain,
  resolveFreeText,
  type TopicNode,
  type TopicParams,
} from '@/lib/content/topic-engine'
import type { GenerationInputs, TopicChain } from '@/lib/llm/content/types'

/** Hardcoded brand ID for single-user app. Replaced with session lookup once INF-05 is live. */
const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

type ActionResult<T = void> = ({ ok: true } & (T extends void ? Record<string, never> : { data: T })) | { ok: false; error: string }

// ---------------------------------------------------------------------------
// Picker — favourite toggle
// ---------------------------------------------------------------------------

export async function toggleContentTypeFavouriteAction(contentTypeId: string): Promise<ActionResult<{ isFavourite: boolean }>> {
  try {
    const existing = await db
      .select({ contentTypeId: brandContentTypeFavourites.contentTypeId })
      .from(brandContentTypeFavourites)
      .where(
        and(
          eq(brandContentTypeFavourites.brandId, BRAND_ID),
          eq(brandContentTypeFavourites.contentTypeId, contentTypeId),
        ),
      )
      .limit(1)

    if (existing.length > 0) {
      await db
        .delete(brandContentTypeFavourites)
        .where(
          and(
            eq(brandContentTypeFavourites.brandId, BRAND_ID),
            eq(brandContentTypeFavourites.contentTypeId, contentTypeId),
          ),
        )
      revalidatePath('/content')
      return { ok: true, data: { isFavourite: false } }
    }

    await db.insert(brandContentTypeFavourites).values({
      brandId: BRAND_ID,
      contentTypeId,
    })
    revalidatePath('/content')
    return { ok: true, data: { isFavourite: true } }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ---------------------------------------------------------------------------
// Topic engine — server action wrappers (client-callable)
// ---------------------------------------------------------------------------

export async function listTopicCategoriesAction(): Promise<TopicNode[]> {
  return listCategories(BRAND_ID)
}

export async function listTopicChildrenAction(
  parentTopicPathId: string,
  params: TopicParams,
): Promise<TopicNode[]> {
  return listChildren(BRAND_ID, parentTopicPathId, params)
}

export async function resolveTopicChainAction(
  leafKey: string,
  params: TopicParams,
  selectedItems: TopicNode[],
): Promise<TopicChain> {
  return resolveChain(BRAND_ID, leafKey, params, selectedItems)
}

export async function resolveTopicFreeTextAction(text: string): Promise<TopicChain> {
  return resolveFreeText(text)
}

// ---------------------------------------------------------------------------
// Assemble — Step-D Generate handler.
//
// Inserts a generation_runs row, calls assemble(), persists the result.
// 4a stops here — no model call. 4b plugs the model call onto the assembled run.
// ---------------------------------------------------------------------------

export type AssembleContentRunInput = {
  contentTypeSlug: string
  inputs: GenerationInputs
}

export type AssembleContentRunResult =
  | { ok: true; runId: string; assembledPrompt: string }
  | { ok: false; error: string; runId?: string }

export async function assembleContentRunAction(
  args: AssembleContentRunInput,
): Promise<AssembleContentRunResult> {
  // 1. Resolve content type + stage
  const [contentType] = await db
    .select()
    .from(contentTypes)
    .where(eq(contentTypes.slug, args.contentTypeSlug))
    .limit(1)
  if (!contentType) {
    return { ok: false, error: `Content type not found: ${args.contentTypeSlug}` }
  }

  const [stage] = await db
    .select()
    .from(promptStages)
    .where(eq(promptStages.contentTypeId, contentType.id))
    .limit(1)
  if (!stage) {
    return { ok: false, error: `No prompt stage for content type ${args.contentTypeSlug}` }
  }

  // 2. Insert generation_runs row in `generating` state
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  const [run] = await db
    .insert(generationRuns)
    .values({
      contentTypeId: contentType.id,
      stageId: stage.id,
      status: 'generating',
      inputs: args.inputs,
      expiresAt,
    })
    .returning({ id: generationRuns.id })

  // 3. Assemble. On failure, mark errored and return.
  try {
    const result = await assemble({
      brandId: BRAND_ID,
      contentType,
      stage,
      inputs: args.inputs,
    })

    await db
      .update(generationRuns)
      .set({
        status: 'complete',
        assembledPrompt: result.text,
        fragmentVersions: result.fragmentVersions,
        modelUsed: args.inputs.settings.model_override ?? null,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(generationRuns.id, run.id))

    return { ok: true, runId: run.id, assembledPrompt: result.text }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown assembler error'
    await db
      .update(generationRuns)
      .set({
        status: 'errored',
        errorText: message,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(generationRuns.id, run.id))
    return { ok: false, error: message, runId: run.id }
  }
}
