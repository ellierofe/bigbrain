'use server'

import { revalidatePath } from 'next/cache'
import {
  deleteIdea as dbDeleteIdea,
  tagIdea as dbTagIdea,
  untagIdea as dbUntagIdea,
} from '@/lib/db/queries/ideas'
import { ideaWrites, type WriteContext } from '@/lib/db/writes'
import type { IdeaType, IdeaStatus, IdeaTagEntityType } from '@/lib/types/ideas'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

function uiCtx(path: string = '/inputs/ideas'): WriteContext {
  return { actor: `ui:${path}`, brandId: BRAND_ID }
}

export async function createIdea(input: {
  text: string
  type: IdeaType
  contextPage: string | null
}): Promise<ActionResult<{ id: string }>> {
  if (!ideaWrites.create) {
    return { ok: false, error: 'Idea creation not supported.' }
  }
  const result = await ideaWrites.create(
    {
      text: input.text,
      type: input.type,
      contextPage: input.contextPage,
    },
    uiCtx()
  )
  if (!result.ok) return { ok: false, error: result.error }
  for (const path of result.pathsToRevalidate) revalidatePath(path)
  return { ok: true, data: result.data }
}

export async function updateIdeaText(
  id: string,
  text: string
): Promise<ActionResult> {
  const result = await ideaWrites.updateField(id, 'text', text, uiCtx())
  if (!result.ok) return { ok: false, error: result.error }
  for (const path of result.pathsToRevalidate) revalidatePath(path)
  return { ok: true, data: undefined }
}

export async function updateIdeaStatus(
  id: string,
  status: IdeaStatus
): Promise<ActionResult> {
  const result = await ideaWrites.updateField(id, 'status', status, uiCtx())
  if (!result.ok) return { ok: false, error: result.error }
  for (const path of result.pathsToRevalidate) revalidatePath(path)
  return { ok: true, data: undefined }
}

export async function updateIdeaType(
  id: string,
  type: IdeaType
): Promise<ActionResult> {
  const result = await ideaWrites.updateField(id, 'type', type, uiCtx())
  if (!result.ok) return { ok: false, error: result.error }
  for (const path of result.pathsToRevalidate) revalidatePath(path)
  return { ok: true, data: undefined }
}

export async function deleteIdea(id: string): Promise<ActionResult> {
  try {
    await dbDeleteIdea(id)
    revalidatePath('/inputs/ideas')
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('deleteIdea error', err)
    return { ok: false, error: 'Failed to delete idea.' }
  }
}

export async function tagIdeaAction(
  ideaId: string,
  entityType: IdeaTagEntityType,
  entityId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const result = await dbTagIdea(ideaId, entityType, entityId)
    revalidatePath('/inputs/ideas')
    return { ok: true, data: result }
  } catch (err) {
    console.error('tagIdea error', err)
    return { ok: false, error: 'Failed to tag idea.' }
  }
}

export async function untagIdeaAction(tagId: string): Promise<ActionResult> {
  try {
    await dbUntagIdea(tagId)
    revalidatePath('/inputs/ideas')
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('untagIdea error', err)
    return { ok: false, error: 'Failed to remove tag.' }
  }
}
