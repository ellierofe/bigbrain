import { Lightbulb } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { IdeasPageClient } from './ideas-client'
import { listIdeas, getTagsForIdeas } from '@/lib/db/queries/ideas'
import { listTaggableEntities } from '@/lib/db/queries/taggable-entities'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export default async function IdeasPage() {
  const ideas = await listIdeas(BRAND_ID)
  const ideaIds = ideas.map((i) => i.id)

  const [tagsMap, taggableEntities] = await Promise.all([
    getTagsForIdeas(ideaIds),
    listTaggableEntities(BRAND_ID),
  ])

  // Resolve entity names onto tags
  const entityNameMap = new Map(taggableEntities.map((e) => [`${e.entityType}:${e.id}`, e.name]))
  const resolvedTags: Record<string, typeof tagsMap[string]> = {}
  for (const [ideaId, tags] of Object.entries(tagsMap)) {
    resolvedTags[ideaId] = tags.map((t) => ({
      ...t,
      entityName: entityNameMap.get(`${t.entityType}:${t.entityId}`) ?? null,
    }))
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <PageHeader
        title="Ideas & Questions"
        subtitle={`${ideas.length} captured`}
        icon={Lightbulb}
      />
      <IdeasPageClient
        ideas={ideas}
        tagsMap={resolvedTags}
        taggableEntities={taggableEntities}
      />
    </div>
  )
}
