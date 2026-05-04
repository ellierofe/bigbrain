import { eq, and, desc, count, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  clientProjects,
  organisations,
  projectMissions,
  projectInputs,
  projectStats,
} from '@/lib/db/schema/projects'
import { missions } from '@/lib/db/schema/missions'
import { srcSourceDocuments } from '@/lib/db/schema/source'
import { srcStatistics } from '@/lib/db/schema/source'
import { ideas, ideaTags } from '@/lib/db/schema/inputs/ideas'
import type {
  ClientProjectSummary,
  ClientProjectDetail,
  ProjectStatus,
  LinkedMission,
  LinkedInput,
  LinkedStat,
  LinkedIdea,
} from '@/lib/types/client-projects'

// ---------------------------------------------------------------------------
// List / filter
// ---------------------------------------------------------------------------

/** All projects for a brand with org name, optionally filtered by status */
export async function listClientProjects(
  brandId: string,
  statusFilter?: ProjectStatus
): Promise<ClientProjectSummary[]> {
  const conditions = [eq(clientProjects.brandId, brandId)]
  if (statusFilter) {
    conditions.push(eq(clientProjects.status, statusFilter))
  }

  const rows = await db
    .select({
      id: clientProjects.id,
      name: clientProjects.name,
      status: clientProjects.status,
      organisationName: organisations.name,
      updatedAt: clientProjects.updatedAt,
    })
    .from(clientProjects)
    .innerJoin(organisations, eq(clientProjects.organisationId, organisations.id))
    .where(and(...conditions))
    .orderBy(desc(clientProjects.updatedAt))

  return rows as ClientProjectSummary[]
}

/** Count projects per status for filter badges */
export async function getProjectStatusCounts(brandId: string): Promise<Record<string, number>> {
  const rows = await db
    .select({
      status: clientProjects.status,
      count: sql<number>`count(*)::int`,
    })
    .from(clientProjects)
    .where(eq(clientProjects.brandId, brandId))
    .groupBy(clientProjects.status)

  const counts: Record<string, number> = {}
  let total = 0
  for (const row of rows) {
    counts[row.status] = row.count
    total += row.count
  }
  counts.all = total
  return counts
}

// ---------------------------------------------------------------------------
// Single project
// ---------------------------------------------------------------------------

/** Get a single project with org name */
export async function getClientProject(id: string): Promise<ClientProjectDetail | null> {
  const rows = await db
    .select({
      id: clientProjects.id,
      brandId: clientProjects.brandId,
      name: clientProjects.name,
      organisationId: clientProjects.organisationId,
      organisationName: organisations.name,
      brief: clientProjects.brief,
      status: clientProjects.status,
      graphNodeId: clientProjects.graphNodeId,
      createdAt: clientProjects.createdAt,
      updatedAt: clientProjects.updatedAt,
    })
    .from(clientProjects)
    .innerJoin(organisations, eq(clientProjects.organisationId, organisations.id))
    .where(eq(clientProjects.id, id))
    .limit(1)

  return (rows[0] as ClientProjectDetail) ?? null
}

// ---------------------------------------------------------------------------
// Create / update
// ---------------------------------------------------------------------------

/** Create a new client project */
export async function createClientProject(input: {
  brandId: string
  name: string
  organisationId: string
  brief?: string
}): Promise<{ id: string }> {
  const rows = await db
    .insert(clientProjects)
    .values(input)
    .returning({ id: clientProjects.id })

  return rows[0]
}

/** Update a single field on a project */
export async function updateProjectField(
  id: string,
  field: 'name' | 'brief' | 'status' | 'organisationId',
  value: string | null
): Promise<void> {
  await db
    .update(clientProjects)
    .set({ [field]: value, updatedAt: new Date() })
    .where(eq(clientProjects.id, id))
}

// ---------------------------------------------------------------------------
// Linked items — queries
// ---------------------------------------------------------------------------

/** Missions linked to a project */
export async function getProjectMissions(projectId: string): Promise<LinkedMission[]> {
  const rows = await db
    .select({
      id: projectMissions.id,
      name: missions.name,
      phase: missions.phase,
      updatedAt: missions.updatedAt,
    })
    .from(projectMissions)
    .innerJoin(missions, eq(projectMissions.missionId, missions.id))
    .where(eq(projectMissions.projectId, projectId))
    .orderBy(desc(missions.updatedAt))

  return rows as LinkedMission[]
}

/** Source documents (inputs) linked to a project */
export async function getProjectInputs(projectId: string): Promise<LinkedInput[]> {
  const rows = await db
    .select({
      id: projectInputs.id,
      sourceDocumentId: projectInputs.sourceDocumentId,
      title: srcSourceDocuments.title,
      type: srcSourceDocuments.sourceType,
      createdAt: srcSourceDocuments.createdAt,
    })
    .from(projectInputs)
    .innerJoin(srcSourceDocuments, eq(projectInputs.sourceDocumentId, srcSourceDocuments.id))
    .where(eq(projectInputs.projectId, projectId))
    .orderBy(desc(srcSourceDocuments.createdAt))

  return rows as LinkedInput[]
}

/** Statistics linked to a project */
export async function getProjectStats(projectId: string): Promise<LinkedStat[]> {
  const rows = await db
    .select({
      id: projectStats.id,
      statId: projectStats.statId,
      claim: srcStatistics.stat,
      source: srcStatistics.source,
      statDate: srcStatistics.sourceYear,
    })
    .from(projectStats)
    .innerJoin(srcStatistics, eq(projectStats.statId, srcStatistics.id))
    .where(eq(projectStats.projectId, projectId))
    .orderBy(desc(srcStatistics.createdAt))

  return rows.map((r) => ({
    ...r,
    statDate: r.statDate != null ? String(r.statDate) : null,
  })) as LinkedStat[]
}

/** Ideas tagged to a project (via polymorphic idea_tags) */
export async function getProjectIdeas(projectId: string): Promise<LinkedIdea[]> {
  const rows = await db
    .select({
      id: ideas.id,
      text: ideas.text,
      type: ideas.type,
      status: ideas.status,
      createdAt: ideas.createdAt,
    })
    .from(ideaTags)
    .innerJoin(ideas, eq(ideaTags.ideaId, ideas.id))
    .where(and(eq(ideaTags.entityType, 'client_project'), eq(ideaTags.entityId, projectId)))
    .orderBy(desc(ideas.createdAt))

  return rows as LinkedIdea[]
}

// ---------------------------------------------------------------------------
// Linked items — mutations
// ---------------------------------------------------------------------------

/** Link a mission to a project */
export async function linkMissionToProject(projectId: string, missionId: string): Promise<void> {
  await db.insert(projectMissions).values({ projectId, missionId }).onConflictDoNothing()
}

/** Link a source document to a project */
export async function linkInputToProject(projectId: string, sourceDocumentId: string): Promise<void> {
  await db.insert(projectInputs).values({ projectId, sourceDocumentId }).onConflictDoNothing()
}

/** Link a stat to a project */
export async function linkStatToProject(projectId: string, statId: string): Promise<void> {
  await db.insert(projectStats).values({ projectId, statId }).onConflictDoNothing()
}

/** Link an idea to a project (via polymorphic idea_tags) */
export async function linkIdeaToProject(ideaId: string, projectId: string): Promise<void> {
  await db.insert(ideaTags).values({ ideaId, entityType: 'client_project', entityId: projectId }).onConflictDoNothing()
}

/** Unlink a mission from a project */
export async function unlinkMissionFromProject(linkId: string): Promise<void> {
  await db.delete(projectMissions).where(eq(projectMissions.id, linkId))
}

/** Unlink an input from a project */
export async function unlinkInputFromProject(linkId: string): Promise<void> {
  await db.delete(projectInputs).where(eq(projectInputs.id, linkId))
}

/** Unlink a stat from a project */
export async function unlinkStatFromProject(linkId: string): Promise<void> {
  await db.delete(projectStats).where(eq(projectStats.id, linkId))
}

/** Unlink an idea from a project (via polymorphic idea_tags) */
export async function unlinkIdeaFromProject(ideaId: string, projectId: string): Promise<void> {
  await db
    .delete(ideaTags)
    .where(and(
      eq(ideaTags.ideaId, ideaId),
      eq(ideaTags.entityType, 'client_project'),
      eq(ideaTags.entityId, projectId)
    ))
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

/** Active projects for the dashboard "Current work" section */
export async function getActiveProjectsForDashboard(brandId: string) {
  return db
    .select({
      id: clientProjects.id,
      name: clientProjects.name,
      status: clientProjects.status,
      organisationName: organisations.name,
      updatedAt: clientProjects.updatedAt,
    })
    .from(clientProjects)
    .innerJoin(organisations, eq(clientProjects.organisationId, organisations.id))
    .where(and(eq(clientProjects.brandId, brandId), eq(clientProjects.status, 'active')))
    .orderBy(desc(clientProjects.updatedAt))
    .limit(10)
}

// ---------------------------------------------------------------------------
// Search (for ItemLinker)
// ---------------------------------------------------------------------------

/** Search missions not yet linked to a project */
export async function searchUnlinkedMissions(brandId: string, projectId: string, query: string) {
  const linked = await db
    .select({ missionId: projectMissions.missionId })
    .from(projectMissions)
    .where(eq(projectMissions.projectId, projectId))

  const linkedIds = new Set(linked.map((r) => r.missionId))

  const allMissions = await db
    .select({ id: missions.id, name: missions.name, phase: missions.phase })
    .from(missions)
    .where(eq(missions.brandId, brandId))
    .orderBy(missions.name)

  return allMissions
    .filter((m) => !linkedIds.has(m.id))
    .filter((m) => !query || m.name.toLowerCase().includes(query.toLowerCase()))
}

/** Search source documents not yet linked to a project */
export async function searchUnlinkedInputs(brandId: string, projectId: string, query: string) {
  const linked = await db
    .select({ sourceDocumentId: projectInputs.sourceDocumentId })
    .from(projectInputs)
    .where(eq(projectInputs.projectId, projectId))

  const linkedIds = new Set(linked.map((r) => r.sourceDocumentId))

  const allDocs = await db
    .select({ id: srcSourceDocuments.id, title: srcSourceDocuments.title, type: srcSourceDocuments.sourceType })
    .from(srcSourceDocuments)
    .where(eq(srcSourceDocuments.brandId, brandId))
    .orderBy(desc(srcSourceDocuments.createdAt))

  return allDocs
    .filter((d) => !linkedIds.has(d.id))
    .filter((d) => !query || (d.title ?? '').toLowerCase().includes(query.toLowerCase()))
}

/** Search stats not yet linked to a project */
export async function searchUnlinkedStats(brandId: string, projectId: string, query: string) {
  const linked = await db
    .select({ statId: projectStats.statId })
    .from(projectStats)
    .where(eq(projectStats.projectId, projectId))

  const linkedIds = new Set(linked.map((r) => r.statId))

  const allStats = await db
    .select({ id: srcStatistics.id, stat: srcStatistics.stat, source: srcStatistics.source })
    .from(srcStatistics)
    .where(eq(srcStatistics.brandId, brandId))
    .orderBy(desc(srcStatistics.createdAt))

  return allStats
    .filter((s) => !linkedIds.has(s.id))
    .filter((s) => !query || s.stat.toLowerCase().includes(query.toLowerCase()))
}
