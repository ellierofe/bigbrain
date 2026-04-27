'use server'

import { revalidatePath } from 'next/cache'
import {
  createMission as dbCreateMission,
  updateMissionField as dbUpdateMissionField,
  updateMissionPhase as dbUpdateMissionPhase,
  getMissionById,
  createVertical as dbCreateVertical,
  linkVertical as dbLinkVertical,
  unlinkVertical as dbUnlinkVertical,
  linkContact as dbLinkContact,
  unlinkContact as dbUnlinkContact,
  linkInput as dbLinkInput,
  unlinkInput as dbUnlinkInput,
  linkStat as dbLinkStat,
  unlinkStat as dbUnlinkStat,
  searchVerticals,
  searchUnlinkedContacts,
  searchUnlinkedInputs,
  searchUnlinkedStats,
} from '@/lib/db/queries/missions'
import type { MissionPhase } from '@/lib/types/missions'

/** Hardcoded brand ID — replace with session lookup when multi-brand auth lands */
const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

// ---------------------------------------------------------------------------
// Mission CRUD
// ---------------------------------------------------------------------------

export async function createMission(
  name: string,
  thesis?: string,
  verticalIds?: string[]
): Promise<ActionResult<{ id: string }>> {
  try {
    const id = await dbCreateMission(BRAND_ID, name, thesis)

    if (verticalIds && verticalIds.length > 0) {
      await Promise.all(verticalIds.map((vId) => dbLinkVertical(id, vId)))
    }

    revalidatePath('/projects/missions')
    revalidatePath('/')
    return { ok: true, data: { id } }
  } catch (err) {
    console.error('[MISSION-01] createMission error', err)
    return { ok: false, error: 'Failed to create mission. Please try again.' }
  }
}

export async function saveMissionField(
  id: string,
  field: 'name' | 'thesis',
  value: string | null
): Promise<ActionResult> {
  try {
    await dbUpdateMissionField(id, field, value)
    revalidatePath(`/projects/missions/${id}`)
    revalidatePath('/projects/missions')
    revalidatePath('/')
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('[MISSION-01] saveMissionField error', err)
    return { ok: false, error: 'Save failed. Please try again.' }
  }
}

export async function changeMissionPhase(
  id: string,
  phase: MissionPhase
): Promise<ActionResult> {
  try {
    await dbUpdateMissionPhase(id, phase)
    revalidatePath(`/projects/missions/${id}`)
    revalidatePath('/projects/missions')
    revalidatePath('/')
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('[MISSION-01] changeMissionPhase error', err)
    return { ok: false, error: 'Failed to update phase. Please try again.' }
  }
}

// ---------------------------------------------------------------------------
// Verticals
// ---------------------------------------------------------------------------

export async function createVertical(
  name: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const verticalId = await dbCreateVertical(name.trim())
    return { ok: true, data: { id: verticalId } }
  } catch (err) {
    console.error('[MISSION-01] createVertical error', err)
    return { ok: false, error: 'Failed to create vertical. It may already exist.' }
  }
}

export async function createAndLinkVertical(
  missionId: string,
  name: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const verticalId = await dbCreateVertical(name.trim())
    await dbLinkVertical(missionId, verticalId)
    revalidatePath(`/projects/missions/${missionId}`)
    return { ok: true, data: { id: verticalId } }
  } catch (err) {
    console.error('[MISSION-01] createAndLinkVertical error', err)
    return { ok: false, error: 'Failed to create vertical. It may already exist.' }
  }
}

export async function addVertical(
  missionId: string,
  verticalId: string
): Promise<ActionResult> {
  try {
    await dbLinkVertical(missionId, verticalId)
    revalidatePath(`/projects/missions/${missionId}`)
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('[MISSION-01] addVertical error', err)
    return { ok: false, error: 'Failed to add vertical.' }
  }
}

export async function removeVertical(
  missionId: string,
  verticalId: string
): Promise<ActionResult> {
  try {
    await dbUnlinkVertical(missionId, verticalId)
    revalidatePath(`/projects/missions/${missionId}`)
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('[MISSION-01] removeVertical error', err)
    return { ok: false, error: 'Failed to remove vertical.' }
  }
}

export async function findVerticals(query: string) {
  return searchVerticals(query)
}

// ---------------------------------------------------------------------------
// Link / Unlink items
// ---------------------------------------------------------------------------

export async function linkContactToMission(
  missionId: string,
  contactId: string
): Promise<ActionResult> {
  try {
    await dbLinkContact(missionId, contactId)
    revalidatePath(`/projects/missions/${missionId}`)
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('[MISSION-01] linkContact error', err)
    return { ok: false, error: 'Failed to link contact.' }
  }
}

export async function unlinkContactFromMission(
  missionId: string,
  contactId: string
): Promise<ActionResult> {
  try {
    await dbUnlinkContact(missionId, contactId)
    revalidatePath(`/projects/missions/${missionId}`)
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('[MISSION-01] unlinkContact error', err)
    return { ok: false, error: 'Failed to unlink contact.' }
  }
}

export async function linkInputToMission(
  missionId: string,
  sourceDocumentId: string
): Promise<ActionResult> {
  try {
    await dbLinkInput(missionId, sourceDocumentId)
    revalidatePath(`/projects/missions/${missionId}`)
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('[MISSION-01] linkInput error', err)
    return { ok: false, error: 'Failed to link input.' }
  }
}

export async function unlinkInputFromMission(
  missionId: string,
  sourceDocumentId: string
): Promise<ActionResult> {
  try {
    await dbUnlinkInput(missionId, sourceDocumentId)
    revalidatePath(`/projects/missions/${missionId}`)
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('[MISSION-01] unlinkInput error', err)
    return { ok: false, error: 'Failed to unlink input.' }
  }
}

export async function linkStatToMission(
  missionId: string,
  statId: string
): Promise<ActionResult> {
  try {
    await dbLinkStat(missionId, statId)
    revalidatePath(`/projects/missions/${missionId}`)
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('[MISSION-01] linkStat error', err)
    return { ok: false, error: 'Failed to link stat.' }
  }
}

export async function unlinkStatFromMission(
  missionId: string,
  statId: string
): Promise<ActionResult> {
  try {
    await dbUnlinkStat(missionId, statId)
    revalidatePath(`/projects/missions/${missionId}`)
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('[MISSION-01] unlinkStat error', err)
    return { ok: false, error: 'Failed to unlink stat.' }
  }
}

// ---------------------------------------------------------------------------
// Search (for ItemLinker popovers)
// ---------------------------------------------------------------------------

export async function searchContactsForMission(missionId: string, query: string) {
  return searchUnlinkedContacts(missionId, BRAND_ID, query)
}

export async function searchInputsForMission(missionId: string, query: string) {
  return searchUnlinkedInputs(missionId, BRAND_ID, query)
}

export async function searchStatsForMission(missionId: string, query: string) {
  return searchUnlinkedStats(missionId, BRAND_ID, query)
}
