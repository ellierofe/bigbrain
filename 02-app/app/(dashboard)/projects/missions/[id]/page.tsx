import { notFound } from 'next/navigation'
import {
  getMissionById,
  getMissionVerticals,
  getMissionContacts,
  getMissionInputs,
  getMissionStats,
} from '@/lib/db/queries/missions'
import { listIdeas, getTagsForIdeas } from '@/lib/db/queries/ideas'
import { listTaggableEntities } from '@/lib/db/queries/taggable-entities'
import { MissionWorkspace } from './mission-workspace'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MissionPage({ params }: PageProps) {
  const { id } = await params

  const [mission, missionVerticals, linkedContacts, linkedInputs, linkedStats, allIdeas, taggableEntities] =
    await Promise.all([
      getMissionById(id),
      getMissionVerticals(id),
      getMissionContacts(id),
      getMissionInputs(id),
      getMissionStats(id),
      listIdeas(BRAND_ID),
      listTaggableEntities(BRAND_ID),
    ])

  if (!mission) notFound()

  const ideaIds = allIdeas.map((i) => i.id)
  const tagsMap = await getTagsForIdeas(ideaIds)

  // Resolve entity names onto tags
  const entityNameMap = new Map(taggableEntities.map((e) => [`${e.entityType}:${e.id}`, e.name]))
  const resolvedTags: typeof tagsMap = {}
  for (const [ideaId, tags] of Object.entries(tagsMap)) {
    resolvedTags[ideaId] = tags.map((t) => ({
      ...t,
      entityName: entityNameMap.get(`${t.entityType}:${t.entityId}`) ?? null,
    }))
  }

  return (
    <MissionWorkspace
      mission={mission}
      verticals={missionVerticals}
      linkedContacts={linkedContacts}
      linkedInputs={linkedInputs}
      linkedStats={linkedStats}
      allIdeas={allIdeas}
      ideasTagsMap={resolvedTags}
      taggableEntities={taggableEntities}
    />
  )
}
