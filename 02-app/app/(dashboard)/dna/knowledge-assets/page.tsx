import { redirect } from 'next/navigation'
import { Lightbulb } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { ContentPane } from '@/components/content-pane'
import { PageChrome } from '@/components/page-chrome'
import { listAssets } from '@/lib/db/queries/knowledge-assets'
import { CreateAssetButtonRoot } from './create-asset-button-root'
import { db } from '@/lib/db'
import { dnaAudienceSegments } from '@/lib/db/schema/dna/audience-segments'
import { eq, ne, and } from 'drizzle-orm'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export default async function KnowledgeAssetsIndexPage() {
  const assets = await listAssets(BRAND_ID)

  if (assets.length > 0) {
    redirect(`/dna/knowledge-assets/${assets[0].id}`)
  }

  // Load segments with VOC data for creation modal
  const segments = await db.select({
    id: dnaAudienceSegments.id,
    segmentName: dnaAudienceSegments.segmentName,
    problems: dnaAudienceSegments.problems,
    desires: dnaAudienceSegments.desires,
    objections: dnaAudienceSegments.objections,
    sharedBeliefs: dnaAudienceSegments.sharedBeliefs,
  })
  .from(dnaAudienceSegments)
  .where(and(eq(dnaAudienceSegments.brandId, BRAND_ID), ne(dnaAudienceSegments.status, 'archived')))

  return (
    <div className="flex flex-col h-full">
      <PageChrome
        title="Knowledge Assets"
        subtitle="Methodologies, frameworks, processes, tools, and templates."
      />
      <ContentPane>
        <EmptyState
          icon={Lightbulb}
          heading="No knowledge assets yet"
          description="Document your first methodology, process, or tool to get started."
          action={
            <CreateAssetButtonRoot
              label="Create your first asset"
              brandId={BRAND_ID}
              segments={segments.map(s => ({
                id: s.id,
                segmentName: s.segmentName,
                problems: (s.problems ?? []) as unknown[],
                desires: (s.desires ?? []) as unknown[],
                objections: (s.objections ?? []) as unknown[],
                sharedBeliefs: (s.sharedBeliefs ?? []) as unknown[],
              }))}
            />
          }
        />
      </ContentPane>
    </div>
  )
}
