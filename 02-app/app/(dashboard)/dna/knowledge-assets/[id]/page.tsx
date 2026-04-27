import { notFound } from 'next/navigation'
import { getAssetById, listAssets, countActiveAssets } from '@/lib/db/queries/knowledge-assets'
import { listOutcomesByAsset } from '@/lib/db/queries/entity-outcomes'
import { getSegmentById, listAllSegments } from '@/lib/db/queries/audience-segments'
import { db } from '@/lib/db'
import { dnaAudienceSegments } from '@/lib/db/schema/dna/audience-segments'
import { eq, ne, and } from 'drizzle-orm'
import { KnowledgeAssetDetailView } from '@/components/knowledge-asset-detail-view'
import type { KnowledgeAsset } from '@/lib/types/knowledge-assets'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function KnowledgeAssetDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { tab } = await searchParams

  const [asset, allAssets, activeCount, outcomes, allSegmentsRaw] = await Promise.all([
    getAssetById(id),
    listAssets(BRAND_ID),
    countActiveAssets(BRAND_ID),
    listOutcomesByAsset(id),
    // Full select for VOC data needed by creation modal
    db.select({
      id: dnaAudienceSegments.id,
      segmentName: dnaAudienceSegments.segmentName,
      problems: dnaAudienceSegments.problems,
      desires: dnaAudienceSegments.desires,
      objections: dnaAudienceSegments.objections,
      sharedBeliefs: dnaAudienceSegments.sharedBeliefs,
    })
    .from(dnaAudienceSegments)
    .where(and(eq(dnaAudienceSegments.brandId, BRAND_ID), ne(dnaAudienceSegments.status, 'archived'))),
  ])

  if (!asset) notFound()

  // Load the primary audience segment for VOC mapping
  const primaryAudienceId = asset.targetAudienceIds?.[0]
  const audienceSegment = primaryAudienceId
    ? await getSegmentById(primaryAudienceId)
    : null

  return (
    <KnowledgeAssetDetailView
      asset={asset as KnowledgeAsset}
      allAssets={allAssets}
      activeCount={activeCount}
      defaultTab={tab}
      audienceSegment={audienceSegment}
      outcomes={outcomes}
      allSegments={allSegmentsRaw.map(s => ({
        id: s.id,
        segmentName: s.segmentName,
        status: 'active',
        problems: (s.problems ?? []) as unknown[],
        desires: (s.desires ?? []) as unknown[],
        objections: (s.objections ?? []) as unknown[],
        sharedBeliefs: (s.sharedBeliefs ?? []) as unknown[],
      }))}
    />
  )
}
