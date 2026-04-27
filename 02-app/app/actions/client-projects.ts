'use server'

import { revalidatePath } from 'next/cache'
import {
  createClientProject,
  updateProjectField,
  linkMissionToProject,
  linkInputToProject,
  linkStatToProject,
  linkIdeaToProject,
  unlinkMissionFromProject,
  unlinkInputFromProject,
  unlinkStatFromProject,
  unlinkIdeaFromProject,
  searchUnlinkedMissions,
  searchUnlinkedInputs,
  searchUnlinkedStats,
} from '@/lib/db/queries/client-projects'
import { createOrganisation, listOrganisations } from '@/lib/db/queries/organisations'
import type { ProjectStatus } from '@/lib/types/client-projects'

/** Hardcoded brand ID for single-user app */
const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

// ---------------------------------------------------------------------------
// Project CRUD
// ---------------------------------------------------------------------------

export async function createProjectAction(input: {
  name: string
  organisationId: string
  brief?: string
}): Promise<ActionResult<{ id: string }>> {
  try {
    const result = await createClientProject({ brandId: BRAND_ID, ...input })
    revalidatePath('/projects/clients')
    revalidatePath('/')
    return { ok: true, data: result }
  } catch (err) {
    console.error('createProject error', err)
    return { ok: false, error: 'Failed to create project.' }
  }
}

export async function updateProjectFieldAction(
  id: string,
  field: 'name' | 'brief' | 'status' | 'organisationId',
  value: string | null
): Promise<ActionResult> {
  try {
    await updateProjectField(id, field, value)
    revalidatePath(`/projects/clients/${id}`)
    revalidatePath('/projects/clients')
    revalidatePath('/')
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('updateProjectField error', err)
    return { ok: false, error: 'Failed to update project.' }
  }
}

// ---------------------------------------------------------------------------
// Organisation
// ---------------------------------------------------------------------------

export async function createOrganisationAction(input: {
  name: string
  website?: string
}): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    const result = await createOrganisation({ brandId: BRAND_ID, ...input })
    return { ok: true, data: result }
  } catch (err) {
    console.error('createOrganisation error', err)
    return { ok: false, error: 'Failed to create organisation.' }
  }
}

export async function listOrganisationsAction(): Promise<ActionResult<{ id: string; name: string; website: string | null }[]>> {
  try {
    const orgs = await listOrganisations(BRAND_ID)
    return { ok: true, data: orgs }
  } catch (err) {
    console.error('listOrganisations error', err)
    return { ok: false, error: 'Failed to load organisations.' }
  }
}

// ---------------------------------------------------------------------------
// Link / unlink
// ---------------------------------------------------------------------------

export async function linkItemAction(
  projectId: string,
  itemType: 'mission' | 'input' | 'stat' | 'idea',
  itemId: string
): Promise<ActionResult> {
  try {
    switch (itemType) {
      case 'mission':
        await linkMissionToProject(projectId, itemId)
        break
      case 'input':
        await linkInputToProject(projectId, itemId)
        break
      case 'stat':
        await linkStatToProject(projectId, itemId)
        break
      case 'idea':
        await linkIdeaToProject(itemId, projectId)
        break
    }
    revalidatePath(`/projects/clients/${projectId}`)
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('linkItem error', err)
    return { ok: false, error: `Failed to link ${itemType}.` }
  }
}

export async function unlinkItemAction(
  projectId: string,
  itemType: 'mission' | 'input' | 'stat' | 'idea',
  linkId: string
): Promise<ActionResult> {
  try {
    switch (itemType) {
      case 'mission':
        await unlinkMissionFromProject(linkId)
        break
      case 'input':
        await unlinkInputFromProject(linkId)
        break
      case 'stat':
        await unlinkStatFromProject(linkId)
        break
      case 'idea':
        await unlinkIdeaFromProject(linkId, projectId)
        break
    }
    revalidatePath(`/projects/clients/${projectId}`)
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('unlinkItem error', err)
    return { ok: false, error: `Failed to unlink ${itemType}.` }
  }
}

// ---------------------------------------------------------------------------
// Search (for ItemLinker)
// ---------------------------------------------------------------------------

export async function searchItemsAction(
  projectId: string,
  itemType: 'mission' | 'input' | 'stat',
  query: string
): Promise<ActionResult<{ id: string; label: string; sublabel?: string }[]>> {
  try {
    let results: { id: string; label: string; sublabel?: string }[]

    switch (itemType) {
      case 'mission': {
        const missions = await searchUnlinkedMissions(BRAND_ID, projectId, query)
        results = missions.map((m) => ({ id: m.id, label: m.name, sublabel: m.phase }))
        break
      }
      case 'input': {
        const inputs = await searchUnlinkedInputs(BRAND_ID, projectId, query)
        results = inputs.map((d) => ({ id: d.id, label: d.title ?? 'Untitled', sublabel: d.type ?? undefined }))
        break
      }
      case 'stat': {
        const stats = await searchUnlinkedStats(BRAND_ID, projectId, query)
        results = stats.map((s) => ({
          id: s.id,
          label: s.stat.length > 80 ? s.stat.slice(0, 80) + '…' : s.stat,
          sublabel: s.source ?? undefined,
        }))
        break
      }
    }

    return { ok: true, data: results }
  } catch (err) {
    console.error('searchItems error', err)
    return { ok: false, error: `Failed to search ${itemType}s.` }
  }
}
