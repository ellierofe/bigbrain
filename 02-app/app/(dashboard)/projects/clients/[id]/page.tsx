import { notFound } from 'next/navigation'
import {
  getClientProject,
  getProjectMissions,
  getProjectInputs,
  getProjectStats,
} from '@/lib/db/queries/client-projects'
import { listIdeas, getTagsForIdeas } from '@/lib/db/queries/ideas'
import { listTaggableEntities } from '@/lib/db/queries/taggable-entities'
import { ProjectWorkspace } from './project-workspace'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params

  const [project, missions, inputs, stats, allIdeas, taggableEntities] = await Promise.all([
    getClientProject(id),
    getProjectMissions(id),
    getProjectInputs(id),
    getProjectStats(id),
    listIdeas(BRAND_ID),
    listTaggableEntities(BRAND_ID),
  ])

  if (!project) notFound()

  const ideaIds = allIdeas.map((i) => i.id)
  const tagsMap = await getTagsForIdeas(ideaIds)

  const entityNameMap = new Map(taggableEntities.map((e) => [`${e.entityType}:${e.id}`, e.name]))
  const resolvedTags: typeof tagsMap = {}
  for (const [ideaId, tags] of Object.entries(tagsMap)) {
    resolvedTags[ideaId] = tags.map((t) => ({
      ...t,
      entityName: entityNameMap.get(`${t.entityType}:${t.entityId}`) ?? null,
    }))
  }

  return (
    <ProjectWorkspace
      project={project}
      missions={missions}
      inputs={inputs}
      stats={stats}
      allIdeas={allIdeas}
      ideasTagsMap={resolvedTags}
      taggableEntities={taggableEntities}
    />
  )
}
