import { eq, and, desc, sql, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { ideas, ideaTags } from '@/lib/db/schema/inputs/ideas'
import type { Idea, IdeaCounts, IdeaTag, IdeaTagEntityType, IdeaWithTags } from '@/lib/types/ideas'

/** All ideas for a brand, newest first */
export async function listIdeas(brandId: string): Promise<Idea[]> {
  const rows = await db
    .select()
    .from(ideas)
    .where(eq(ideas.brandId, brandId))
    .orderBy(desc(ideas.createdAt))

  return rows as Idea[]
}

/** Create a new idea */
export async function createIdea(input: {
  brandId: string
  text: string
  type: string
  source: string
  contextPage: string | null
}): Promise<{ id: string }> {
  const rows = await db
    .insert(ideas)
    .values(input)
    .returning({ id: ideas.id })

  return rows[0]
}

/** Update idea text */
export async function updateIdeaText(id: string, text: string): Promise<void> {
  await db
    .update(ideas)
    .set({ text, updatedAt: new Date() })
    .where(eq(ideas.id, id))
}

/** Update idea status */
export async function updateIdeaStatus(id: string, status: string): Promise<void> {
  await db
    .update(ideas)
    .set({ status, updatedAt: new Date() })
    .where(eq(ideas.id, id))
}

/** Update idea type */
export async function updateIdeaType(id: string, type: string): Promise<void> {
  await db
    .update(ideas)
    .set({ type, updatedAt: new Date() })
    .where(eq(ideas.id, id))
}

/** Hard delete an idea */
export async function deleteIdea(id: string): Promise<void> {
  await db.delete(ideas).where(eq(ideas.id, id))
}

/** Get counts by status and type for a brand */
export async function getIdeaCounts(brandId: string): Promise<IdeaCounts> {
  const rows = await db
    .select({
      status: ideas.status,
      type: ideas.type,
      count: sql<number>`count(*)::int`,
    })
    .from(ideas)
    .where(eq(ideas.brandId, brandId))
    .groupBy(ideas.status, ideas.type)

  const counts: IdeaCounts = { all: 0, captured: 0, shelved: 0, done: 0, ideas: 0, questions: 0 }

  for (const row of rows) {
    counts.all += row.count
    if (row.status === 'captured') counts.captured += row.count
    if (row.status === 'shelved') counts.shelved += row.count
    if (row.status === 'done') counts.done += row.count
    if (row.type === 'idea') counts.ideas += row.count
    if (row.type === 'question') counts.questions += row.count
  }

  return counts
}

// ---------------------------------------------------------------------------
// Tags (polymorphic idea_tags)
// ---------------------------------------------------------------------------

/** Get all tags for a single idea */
export async function getTagsForIdea(ideaId: string): Promise<IdeaTag[]> {
  const rows = await db
    .select()
    .from(ideaTags)
    .where(eq(ideaTags.ideaId, ideaId))
    .orderBy(desc(ideaTags.createdAt))

  return rows.map((r) => ({
    ...r,
    entityName: null, // resolved by the caller with entity names
  })) as IdeaTag[]
}

/** Get all tags for multiple ideas (batch) */
export async function getTagsForIdeas(ideaIds: string[]): Promise<Record<string, IdeaTag[]>> {
  if (ideaIds.length === 0) return {}

  const rows = await db
    .select()
    .from(ideaTags)
    .where(inArray(ideaTags.ideaId, ideaIds))

  const result: Record<string, IdeaTag[]> = {}
  for (const row of rows) {
    if (!result[row.ideaId]) result[row.ideaId] = []
    result[row.ideaId].push({ ...row, entityName: null } as IdeaTag)
  }
  return result
}

/** Tag an idea to an entity */
export async function tagIdea(
  ideaId: string,
  entityType: IdeaTagEntityType,
  entityId: string,
): Promise<{ id: string }> {
  const rows = await db
    .insert(ideaTags)
    .values({ ideaId, entityType, entityId })
    .onConflictDoNothing()
    .returning({ id: ideaTags.id })

  return rows[0] ?? { id: '' }
}

/** Remove a tag from an idea */
export async function untagIdea(tagId: string): Promise<void> {
  await db.delete(ideaTags).where(eq(ideaTags.id, tagId))
}

/** Remove a tag by idea + entity (for when you don't have the tag ID) */
export async function untagIdeaByEntity(
  ideaId: string,
  entityType: IdeaTagEntityType,
  entityId: string,
): Promise<void> {
  await db
    .delete(ideaTags)
    .where(and(
      eq(ideaTags.ideaId, ideaId),
      eq(ideaTags.entityType, entityType),
      eq(ideaTags.entityId, entityId),
    ))
}

/** List ideas tagged to a specific entity */
export async function getIdeasByEntity(
  entityType: IdeaTagEntityType,
  entityId: string,
): Promise<Idea[]> {
  const rows = await db
    .select({
      id: ideas.id,
      brandId: ideas.brandId,
      text: ideas.text,
      type: ideas.type,
      status: ideas.status,
      source: ideas.source,
      contextPage: ideas.contextPage,
      createdAt: ideas.createdAt,
      updatedAt: ideas.updatedAt,
    })
    .from(ideaTags)
    .innerJoin(ideas, eq(ideaTags.ideaId, ideas.id))
    .where(and(eq(ideaTags.entityType, entityType), eq(ideaTags.entityId, entityId)))
    .orderBy(desc(ideas.createdAt))

  return rows as Idea[]
}
