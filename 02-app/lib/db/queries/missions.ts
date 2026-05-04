import { eq, and, ne, desc, asc, ilike, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  missions,
  verticals,
  missionVerticals,
  missionContacts,
  missionStats,
  missionInputs,
} from '@/lib/db/schema/missions'
import { contacts } from '@/lib/db/schema/inputs'
import { srcStatistics, srcSourceDocuments } from '@/lib/db/schema/source'
import type {
  MissionSummary,
  MissionDetail,
  MissionPhase,
  MissionVertical,
  MissionLinkedContact,
  MissionLinkedInput,
  MissionLinkedStat,
} from '@/lib/types/missions'

// ---------------------------------------------------------------------------
// Missions
// ---------------------------------------------------------------------------

/** All missions for a brand, excluding paused. Ordered by updatedAt desc. */
export async function listMissions(brandId: string): Promise<MissionSummary[]> {
  const rows = await db
    .select({
      id: missions.id,
      name: missions.name,
      thesis: missions.thesis,
      phase: missions.phase,
      updatedAt: missions.updatedAt,
    })
    .from(missions)
    .where(eq(missions.brandId, brandId))
    .orderBy(desc(missions.updatedAt))

  return rows as MissionSummary[]
}

/** Single mission by ID */
export async function getMissionById(id: string): Promise<MissionDetail | null> {
  const rows = await db
    .select()
    .from(missions)
    .where(eq(missions.id, id))
    .limit(1)

  if (rows.length === 0) return null
  return rows[0] as MissionDetail
}

/** Create a mission, return its ID */
export async function createMission(
  brandId: string,
  name: string,
  thesis?: string
): Promise<string> {
  const rows = await db
    .insert(missions)
    .values({ brandId, name, thesis: thesis || null })
    .returning({ id: missions.id })

  return rows[0].id
}

/** Update a scalar field on a mission */
export async function updateMissionField(
  id: string,
  field: 'name' | 'thesis',
  value: string | null
): Promise<void> {
  await db
    .update(missions)
    .set({ [field]: value, updatedAt: new Date() })
    .where(eq(missions.id, id))
}

/** Update mission phase */
export async function updateMissionPhase(
  id: string,
  phase: MissionPhase
): Promise<void> {
  await db
    .update(missions)
    .set({ phase, updatedAt: new Date() })
    .where(eq(missions.id, id))
}

/** Count missions by phase for a brand */
export async function countMissionsByPhase(
  brandId: string
): Promise<Record<MissionPhase | 'all', number>> {
  const rows = await db
    .select({ phase: missions.phase, count: sql<number>`count(*)::int` })
    .from(missions)
    .where(eq(missions.brandId, brandId))
    .groupBy(missions.phase)

  const counts: Record<string, number> = { all: 0, exploring: 0, synthesising: 0, producing: 0, complete: 0, paused: 0 }
  for (const row of rows) {
    counts[row.phase] = row.count
    counts.all += row.count
  }
  return counts as Record<MissionPhase | 'all', number>
}

// ---------------------------------------------------------------------------
// Verticals
// ---------------------------------------------------------------------------

/** All verticals, ordered by name */
export async function listVerticals(): Promise<MissionVertical[]> {
  const rows = await db
    .select({ id: verticals.id, name: verticals.name })
    .from(verticals)
    .orderBy(asc(verticals.name))

  return rows
}

/** Search verticals by name prefix */
export async function searchVerticals(query: string): Promise<MissionVertical[]> {
  const rows = await db
    .select({ id: verticals.id, name: verticals.name })
    .from(verticals)
    .where(ilike(verticals.name, `%${query}%`))
    .orderBy(asc(verticals.name))
    .limit(20)

  return rows
}

/** Create a vertical, return its ID */
export async function createVertical(name: string): Promise<string> {
  const rows = await db
    .insert(verticals)
    .values({ name })
    .returning({ id: verticals.id })

  return rows[0].id
}

// ---------------------------------------------------------------------------
// Mission ↔ Vertical links
// ---------------------------------------------------------------------------

/** Get verticals linked to a mission */
export async function getMissionVerticals(missionId: string): Promise<MissionVertical[]> {
  const rows = await db
    .select({ id: verticals.id, name: verticals.name })
    .from(missionVerticals)
    .innerJoin(verticals, eq(missionVerticals.verticalId, verticals.id))
    .where(eq(missionVerticals.missionId, missionId))
    .orderBy(asc(verticals.name))

  return rows
}

/** Link a vertical to a mission */
export async function linkVertical(missionId: string, verticalId: string): Promise<void> {
  await db
    .insert(missionVerticals)
    .values({ missionId, verticalId })
    .onConflictDoNothing()
}

/** Unlink a vertical from a mission */
export async function unlinkVertical(missionId: string, verticalId: string): Promise<void> {
  await db
    .delete(missionVerticals)
    .where(
      and(
        eq(missionVerticals.missionId, missionId),
        eq(missionVerticals.verticalId, verticalId)
      )
    )
}

// ---------------------------------------------------------------------------
// Mission ↔ Contact links
// ---------------------------------------------------------------------------

/** Get contacts linked to a mission */
export async function getMissionContacts(missionId: string): Promise<MissionLinkedContact[]> {
  const rows = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      role: contacts.role,
      organisation: contacts.organisation,
    })
    .from(missionContacts)
    .innerJoin(contacts, eq(missionContacts.contactId, contacts.id))
    .where(eq(missionContacts.missionId, missionId))
    .orderBy(asc(contacts.name))

  return rows as MissionLinkedContact[]
}

/** Search contacts not yet linked to a mission */
export async function searchUnlinkedContacts(
  missionId: string,
  brandId: string,
  query: string
): Promise<MissionLinkedContact[]> {
  const linked = db
    .select({ contactId: missionContacts.contactId })
    .from(missionContacts)
    .where(eq(missionContacts.missionId, missionId))

  const rows = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      role: contacts.role,
      organisation: contacts.organisation,
    })
    .from(contacts)
    .where(
      and(
        eq(contacts.brandId, brandId),
        ilike(contacts.name, `%${query}%`),
        sql`${contacts.id} NOT IN (${linked})`
      )
    )
    .orderBy(asc(contacts.name))
    .limit(10)

  return rows as MissionLinkedContact[]
}

/** Link a contact to a mission */
export async function linkContact(missionId: string, contactId: string): Promise<void> {
  await db.insert(missionContacts).values({ missionId, contactId }).onConflictDoNothing()
}

/** Unlink a contact from a mission */
export async function unlinkContact(missionId: string, contactId: string): Promise<void> {
  await db
    .delete(missionContacts)
    .where(
      and(
        eq(missionContacts.missionId, missionId),
        eq(missionContacts.contactId, contactId)
      )
    )
}

// ---------------------------------------------------------------------------
// Mission ↔ Source Document (Input) links
// ---------------------------------------------------------------------------

/** Get source documents linked to a mission */
export async function getMissionInputs(missionId: string): Promise<MissionLinkedInput[]> {
  const rows = await db
    .select({
      id: srcSourceDocuments.id,
      title: srcSourceDocuments.title,
      type: srcSourceDocuments.sourceType,
      documentDate: srcSourceDocuments.documentDate,
      createdAt: srcSourceDocuments.createdAt,
    })
    .from(missionInputs)
    .innerJoin(srcSourceDocuments, eq(missionInputs.sourceDocumentId, srcSourceDocuments.id))
    .where(eq(missionInputs.missionId, missionId))
    .orderBy(desc(srcSourceDocuments.createdAt))

  return rows as MissionLinkedInput[]
}

/** Search source documents not yet linked to a mission */
export async function searchUnlinkedInputs(
  missionId: string,
  brandId: string,
  query: string
): Promise<MissionLinkedInput[]> {
  const linked = db
    .select({ sourceDocumentId: missionInputs.sourceDocumentId })
    .from(missionInputs)
    .where(eq(missionInputs.missionId, missionId))

  const rows = await db
    .select({
      id: srcSourceDocuments.id,
      title: srcSourceDocuments.title,
      type: srcSourceDocuments.sourceType,
      documentDate: srcSourceDocuments.documentDate,
      createdAt: srcSourceDocuments.createdAt,
    })
    .from(srcSourceDocuments)
    .where(
      and(
        eq(srcSourceDocuments.brandId, brandId),
        ilike(srcSourceDocuments.title, `%${query}%`),
        sql`${srcSourceDocuments.id} NOT IN (${linked})`
      )
    )
    .orderBy(desc(srcSourceDocuments.createdAt))
    .limit(10)

  return rows as MissionLinkedInput[]
}

/** Link a source document to a mission */
export async function linkInput(missionId: string, sourceDocumentId: string): Promise<void> {
  await db.insert(missionInputs).values({ missionId, sourceDocumentId }).onConflictDoNothing()
}

/** Unlink a source document from a mission */
export async function unlinkInput(missionId: string, sourceDocumentId: string): Promise<void> {
  await db
    .delete(missionInputs)
    .where(
      and(
        eq(missionInputs.missionId, missionId),
        eq(missionInputs.sourceDocumentId, sourceDocumentId)
      )
    )
}

// ---------------------------------------------------------------------------
// Mission ↔ Statistic links
// ---------------------------------------------------------------------------

/** Get stats linked to a mission */
export async function getMissionStats(missionId: string): Promise<MissionLinkedStat[]> {
  const rows = await db
    .select({
      id: srcStatistics.id,
      stat: srcStatistics.stat,
      source: srcStatistics.source,
      sourceYear: srcStatistics.sourceYear,
    })
    .from(missionStats)
    .innerJoin(srcStatistics, eq(missionStats.statId, srcStatistics.id))
    .where(eq(missionStats.missionId, missionId))
    .orderBy(desc(srcStatistics.createdAt))

  return rows as MissionLinkedStat[]
}

/** Search stats not yet linked to a mission */
export async function searchUnlinkedStats(
  missionId: string,
  brandId: string,
  query: string
): Promise<MissionLinkedStat[]> {
  const linked = db
    .select({ statId: missionStats.statId })
    .from(missionStats)
    .where(eq(missionStats.missionId, missionId))

  const rows = await db
    .select({
      id: srcStatistics.id,
      stat: srcStatistics.stat,
      source: srcStatistics.source,
      sourceYear: srcStatistics.sourceYear,
    })
    .from(srcStatistics)
    .where(
      and(
        eq(srcStatistics.brandId, brandId),
        ilike(srcStatistics.stat, `%${query}%`),
        sql`${srcStatistics.id} NOT IN (${linked})`
      )
    )
    .orderBy(desc(srcStatistics.createdAt))
    .limit(10)

  return rows as MissionLinkedStat[]
}

/** Link a stat to a mission */
export async function linkStat(missionId: string, statId: string): Promise<void> {
  await db.insert(missionStats).values({ missionId, statId }).onConflictDoNothing()
}

/** Unlink a stat from a mission */
export async function unlinkStat(missionId: string, statId: string): Promise<void> {
  await db
    .delete(missionStats)
    .where(
      and(
        eq(missionStats.missionId, missionId),
        eq(missionStats.statId, statId)
      )
    )
}

// ---------------------------------------------------------------------------
// Dashboard queries
// ---------------------------------------------------------------------------

/** Active missions for the dashboard "Current work" section */
export async function getActiveMissions(brandId: string): Promise<MissionSummary[]> {
  const rows = await db
    .select({
      id: missions.id,
      name: missions.name,
      thesis: missions.thesis,
      phase: missions.phase,
      updatedAt: missions.updatedAt,
    })
    .from(missions)
    .where(
      and(
        eq(missions.brandId, brandId),
        ne(missions.phase, 'complete'),
        ne(missions.phase, 'paused')
      )
    )
    .orderBy(desc(missions.updatedAt))
    .limit(5)

  return rows as MissionSummary[]
}
