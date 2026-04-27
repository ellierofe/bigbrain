'use server'

import { revalidatePath } from 'next/cache'
import {
  updateAssetField,
  updateAssetJsonField,
  createAsset,
  getAssetById,
  countActiveAssets,
  getAssetDependents,
  archiveAsset,
  activateAsset,
  findNextAsset,
} from '@/lib/db/queries/knowledge-assets'
import { writeNode } from '@/lib/graph/write'
import type { CreateAssetInput } from '@/lib/types/knowledge-assets'

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string }

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

function revalidateAssets() {
  revalidatePath('/dna/knowledge-assets', 'layout')
}

// ---------------------------------------------------------------------------
// Field autosave
// ---------------------------------------------------------------------------

export async function saveAssetField(
  id: string,
  field: string,
  value: string
): Promise<ActionResult> {
  try {
    await updateAssetField(id, field, value)
    revalidateAssets()
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Save failed' }
  }
}

export async function saveAssetJsonField(
  id: string,
  field: string,
  value: unknown
): Promise<ActionResult> {
  try {
    await updateAssetJsonField(id, field, value)
    revalidateAssets()
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Save failed' }
  }
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createKnowledgeAsset(
  input: CreateAssetInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const id = await createAsset(BRAND_ID, {
      name: input.name,
      kind: input.kind,
      status: input.status ?? 'draft',
      proprietary: input.proprietary ?? true,
      targetAudienceIds: input.targetAudienceIds,
      sourceDocumentIds: input.sourceDocumentIds,
      vocMapping: input.vocMapping,
    })
    revalidateAssets()
    return { ok: true, data: { id } }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Create failed' }
  }
}

// ---------------------------------------------------------------------------
// Save generated content (after LLM generation)
// ---------------------------------------------------------------------------

export async function saveGeneratedAsset(
  id: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  try {
    // Save each field from the generation output
    const textFields = [
      'summary', 'principles', 'origin', 'objectives',
      'problemsSolved', 'contexts', 'priorKnowledge', 'resources',
    ] as const

    for (const field of textFields) {
      if (data[field] && typeof data[field] === 'string') {
        await updateAssetField(id, field, data[field] as string)
      }
    }

    const jsonFields = ['keyComponents', 'flow', 'detail', 'faqs'] as const
    for (const field of jsonFields) {
      if (data[field] !== undefined) {
        await updateAssetJsonField(id, field, data[field])
      }
    }

    // Set status to active after successful generation
    await updateAssetJsonField(id, 'status', 'active')

    revalidateAssets()
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Save failed' }
  }
}

// ---------------------------------------------------------------------------
// Archive flow
// ---------------------------------------------------------------------------

export async function checkAndArchiveAsset(
  id: string
): Promise<ActionResult<{ dependents: { name: string; type: string }[] }>> {
  try {
    const asset = await getAssetById(id)
    if (!asset) return { ok: false, error: 'Asset not found' }

    const activeCount = await countActiveAssets(asset.brandId)
    if (activeCount <= 1 && asset.status === 'active') {
      return { ok: false, error: 'Cannot archive the last active knowledge asset' }
    }

    const dependents = await getAssetDependents(id)
    return { ok: true, data: { dependents } }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Check failed' }
  }
}

export async function confirmArchiveAsset(
  id: string
): Promise<ActionResult<{ nextId: string | null }>> {
  try {
    const asset = await getAssetById(id)
    if (!asset) return { ok: false, error: 'Asset not found' }

    await archiveAsset(id)
    const nextId = await findNextAsset(asset.brandId, id)
    revalidateAssets()
    return { ok: true, data: { nextId } }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Archive failed' }
  }
}

export async function markAssetActive(
  id: string
): Promise<ActionResult> {
  try {
    await activateAsset(id)
    revalidateAssets()
    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Activate failed' }
  }
}

// ---------------------------------------------------------------------------
// Graph linking (Methodology kind only)
// ---------------------------------------------------------------------------

export async function linkAssetToGraph(
  id: string
): Promise<ActionResult<{ graphNodeId: string }>> {
  try {
    const asset = await getAssetById(id)
    if (!asset) return { ok: false, error: 'Asset not found' }

    if (asset.kind !== 'methodology') {
      return { ok: false, error: 'Only methodology-kind assets can be linked to the graph' }
    }

    if (asset.graphNodeId) {
      return { ok: false, error: 'Asset is already linked to the graph' }
    }

    const nodeId = crypto.randomUUID()

    await writeNode({
      id: nodeId,
      label: 'Methodology',
      name: asset.name,
      description: asset.summary ?? `Methodology: ${asset.name}`,
      source: 'MANUAL',
      properties: {
        postgresId: asset.id,
        kind: asset.kind,
      },
    })

    await updateAssetJsonField(id, 'graphNodeId', nodeId)
    revalidateAssets()
    return { ok: true, data: { graphNodeId: nodeId } }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Graph linking failed' }
  }
}
