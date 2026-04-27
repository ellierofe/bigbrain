'use server'

import { revalidatePath } from 'next/cache'
import {
  createIdea as dbCreateIdea,
  updateIdeaText as dbUpdateText,
  updateIdeaStatus as dbUpdateStatus,
  updateIdeaType as dbUpdateType,
  deleteIdea as dbDeleteIdea,
  tagIdea as dbTagIdea,
  untagIdea as dbUntagIdea,
} from '@/lib/db/queries/ideas'
import type { IdeaType, IdeaStatus, IdeaTagEntityType } from '@/lib/types/ideas'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export async function createIdea(input: {
  text: string
  type: IdeaType
  contextPage: string | null
}): Promise<ActionResult<{ id: string }>> {
  try {
    const result = await dbCreateIdea({
      brandId: BRAND_ID,
      text: input.text,
      type: input.type,
      source: 'manual',
      contextPage: input.contextPage,
    })
    revalidatePath('/inputs/ideas')
    return { ok: true, data: result }
  } catch (err) {
    console.error('createIdea error', err)
    return { ok: false, error: 'Failed to capture idea.' }
  }
}

export async function updateIdeaText(
  id: string,
  text: string
): Promise<ActionResult> {
  try {
    await dbUpdateText(id, text)
    revalidatePath('/inputs/ideas')
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('updateIdeaText error', err)
    return { ok: false, error: 'Failed to update idea.' }
  }
}

export async function updateIdeaStatus(
  id: string,
  status: IdeaStatus
): Promise<ActionResult> {
  try {
    await dbUpdateStatus(id, status)
    revalidatePath('/inputs/ideas')
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('updateIdeaStatus error', err)
    return { ok: false, error: 'Failed to update status.' }
  }
}

export async function updateIdeaType(
  id: string,
  type: IdeaType
): Promise<ActionResult> {
  try {
    await dbUpdateType(id, type)
    revalidatePath('/inputs/ideas')
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('updateIdeaType error', err)
    return { ok: false, error: 'Failed to update type.' }
  }
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
