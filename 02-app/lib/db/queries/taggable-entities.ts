import { eq, and, ne, ilike } from 'drizzle-orm'
import { db } from '@/lib/db'
import { missions } from '@/lib/db/schema/missions'
import { clientProjects } from '@/lib/db/schema/projects'
import { dnaOffers } from '@/lib/db/schema/dna/offers'
import { dnaKnowledgeAssets } from '@/lib/db/schema/dna/knowledge-assets'
import { dnaAudienceSegments } from '@/lib/db/schema/dna/audience-segments'
import type { IdeaTagEntityType } from '@/lib/types/ideas'

export interface TaggableEntity {
  id: string
  name: string
  entityType: IdeaTagEntityType
}

/** Fetch all taggable entities for a brand, grouped by type */
export async function listTaggableEntities(brandId: string): Promise<TaggableEntity[]> {
  const [missionRows, projectRows, offerRows, kaRows, segmentRows] = await Promise.all([
    db.select({ id: missions.id, name: missions.name })
      .from(missions)
      .where(eq(missions.brandId, brandId)),

    db.select({ id: clientProjects.id, name: clientProjects.name })
      .from(clientProjects)
      .where(and(eq(clientProjects.brandId, brandId), ne(clientProjects.status, 'archived'))),

    db.select({ id: dnaOffers.id, name: dnaOffers.name })
      .from(dnaOffers)
      .where(eq(dnaOffers.brandId, brandId)),

    db.select({ id: dnaKnowledgeAssets.id, name: dnaKnowledgeAssets.name })
      .from(dnaKnowledgeAssets)
      .where(eq(dnaKnowledgeAssets.brandId, brandId)),

    db.select({ id: dnaAudienceSegments.id, name: dnaAudienceSegments.segmentName })
      .from(dnaAudienceSegments)
      .where(and(eq(dnaAudienceSegments.brandId, brandId), ne(dnaAudienceSegments.status, 'archived'))),
  ])

  return [
    ...missionRows.map((r) => ({ ...r, entityType: 'mission' as const })),
    ...projectRows.map((r) => ({ ...r, entityType: 'client_project' as const })),
    ...offerRows.map((r) => ({ ...r, entityType: 'offer' as const })),
    ...kaRows.map((r) => ({ ...r, entityType: 'knowledge_asset' as const })),
    ...segmentRows.map((r) => ({ ...r, entityType: 'audience_segment' as const })),
  ]
}
